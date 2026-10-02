import { NextRequest, NextResponse } from "next/server";

interface ProxyOptions<TBody = unknown, TData = unknown> {
  method?: "GET" | "POST";
  backendUrl: string;
  forwardCookies?: boolean;
  transformRequest?: (body: TBody) => TBody;
  validateRequest?: (body: TBody) => { valid: boolean; error?: string };
  validateResponse?: (data: unknown) => {
    valid: boolean;
    data?: TData;
    error?: string;
  };
  onSuccess?: (data: TData, response: Response) => NextResponse;
  logRequests?: boolean;
  timeout?: number; // Timeout in milliseconds (default: 30000)
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

/**
 * Shared API proxy handler for forwarding requests to Python backend
 * Handles common error patterns, cookie forwarding, and response transformation
 */
export async function proxyToPythonBackend<TBody = unknown, TData = unknown>(
  request: NextRequest,
  options: ProxyOptions<TBody, TData>,
): Promise<NextResponse> {
  const {
    method = "POST",
    backendUrl,
    forwardCookies = false,
    transformRequest,
    validateRequest,
    validateResponse,
    onSuccess,
    logRequests = false,
    timeout = 30000,
  } = options;

  try {
    // Parse request body for POST requests
    let body: TBody | null = null;
    if (method === "POST") {
      try {
        body = await request.json();
      } catch (parseError) {
        return createErrorResponse(
          "Invalid JSON in request body",
          parseError instanceof Error
            ? parseError.message
            : "Failed to parse JSON",
          400,
        );
      }

      if (logRequests) {
        console.debug(`${method} ${backendUrl} called`);
        console.debug("Request body:", JSON.stringify(body, null, 2));
      }

      // Validate request if validator provided
      if (validateRequest && body) {
        const validation = validateRequest(body);
        if (!validation.valid) {
          return createErrorResponse(
            validation.error || "Invalid request",
            "Request validation failed",
            400,
          );
        }
      }

      // Transform request if transformer provided
      if (transformRequest && body) {
        body = transformRequest(body);
        if (logRequests) {
          console.debug("Transformed request:", JSON.stringify(body, null, 2));
        }
      }
    }

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Block dangerous headers by excluding them from forwarded headers
    const dangerousHeaders = ["x-middleware-subrequest", "x-middleware-invoke"];
    const isDangerousHeader = (headerName: string): boolean => {
      const lowerHeader = headerName.toLowerCase();
      return dangerousHeaders.some(
        (dangerous) => lowerHeader === dangerous.toLowerCase(),
      );
    };

    // Forward safe headers from request (excluding dangerous ones)
    request.headers.forEach((_value, key) => {
      if (isDangerousHeader(key)) {
        console.warn(`Blocked dangerous header: ${key}`);
      }
    });

    // Forward all cookies if requested
    if (forwardCookies) {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        headers["Cookie"] = cookieHeader;
      }
    }

    if (logRequests) {
      console.debug("Forwarding to:", backendUrl);
    }

    // Setup timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Make request to backend
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
      ...(method === "POST" && body ? { body: JSON.stringify(body) } : {}),
      ...(forwardCookies
        ? { credentials: "include" as RequestCredentials }
        : {}),
    };

    let response: Response;
    try {
      response = await fetch(backendUrl, fetchOptions);
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return createErrorResponse(
          "Request timeout",
          `Backend did not respond within ${timeout}ms`,
          504,
        );
      }
      throw fetchError;
    } finally {
      // Always clear timeout to prevent memory leaks
      clearTimeout(timeoutId);
    }

    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", response.status, errorText);
      return createErrorResponse(
        `Backend error: ${response.statusText}`,
        errorText,
        response.status,
      );
    }

    // Validate Content-Type before parsing JSON
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      console.error(
        "Non-JSON response received:",
        contentType,
        text.slice(0, 200),
      );
      return createErrorResponse(
        "Invalid response format from backend",
        `Expected JSON but received ${contentType || "unknown content type"}`,
        502,
      );
    }

    // Parse response
    let data: unknown;
    try {
      data = await response.json();
    } catch (jsonError) {
      return createErrorResponse(
        "Failed to parse backend response",
        jsonError instanceof Error
          ? jsonError.message
          : "Invalid JSON in response",
        502,
      );
    }

    if (logRequests) {
      console.debug("Backend response:", JSON.stringify(data, null, 2));
    }

    // Validate response if validator provided
    let validatedData: TData;
    if (validateResponse) {
      const validation = validateResponse(data);
      if (!validation.valid) {
        return createErrorResponse(
          validation.error || "Invalid response from backend",
          "Response validation failed",
          502,
        );
      }
      // Ensure validation.data exists when valid is true
      if (validation.data === undefined) {
        return createErrorResponse(
          "Validator marked response as valid but did not return data",
          "Response validation implementation error",
          502,
        );
      }
      validatedData = validation.data;
    } else {
      // No validation - perform basic type check to ensure data exists
      if (data === null || data === undefined) {
        return createErrorResponse(
          "Backend returned null or undefined response",
          "No validator provided and response is empty",
          502,
        );
      }
      // Type assertion here is intentional - caller opted out of validation
      validatedData = data as TData;
    }

    // Use custom success handler if provided
    if (onSuccess) {
      return onSuccess(validatedData, response);
    }

    // Default: create response and forward cookies if needed
    const nextResponse = NextResponse.json(validatedData);

    if (forwardCookies) {
      // Handle multiple Set-Cookie headers properly
      // getSetCookie() is the correct way to get all Set-Cookie headers
      if (typeof response.headers.getSetCookie === "function") {
        const setCookieHeaders = response.headers.getSetCookie();
        setCookieHeaders.forEach((cookie: string) => {
          nextResponse.headers.append("set-cookie", cookie);
        });
      } else {
        // Fallback: manually iterate through headers to find all Set-Cookie entries
        // Note: response.headers.get('set-cookie') only returns the first one
        const setCookies: string[] = [];
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() === "set-cookie") {
            setCookies.push(value);
          }
        });
        setCookies.forEach((cookie: string) => {
          nextResponse.headers.append("set-cookie", cookie);
        });
      }
    }

    return nextResponse;
  } catch (error) {
    console.error("Proxy error:", error);
    return createErrorResponse(
      "Failed to connect to backend service",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  error: string,
  details?: string,
  status: number = 500,
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

/**
 * Standard OPTIONS handler for CORS
 */
export function handleOptionsRequest(
  allowedMethods: string[] = ["GET", "POST", "OPTIONS"],
  allowedOrigin?: string,
): NextResponse {
  const origin = allowedOrigin || process.env.NEXT_PUBLIC_FRONTEND_URL;

  if (!origin) {
    console.error("CORS configuration missing");
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin || "*",
      "Access-Control-Allow-Methods": allowedMethods.join(", "),
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

/**
 * Health check helper for Python backend
 */
export async function checkBackendHealth(backendUrl: string): Promise<boolean> {
  try {
    const healthCheck = await fetch(`${backendUrl}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return healthCheck.ok;
  } catch {
    return false;
  }
}
