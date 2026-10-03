import { NextRequest, NextResponse } from "next/server";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

/** Standard error shape: { success: false, error, details? } */
export function errorResponse(error: string, status: number, details?: string) {
  return NextResponse.json(
    { success: false, error, ...(details ? { details } : {}) },
    { status },
  );
}

/**
 * Forward a request to the Python backend (POST bodies are JSON, optionally
 * transformed) and relay its body, status and content type.
 */
export async function proxyToPythonBackend(
  request: NextRequest,
  path: string,
  transform: (body: any) => unknown = (body) => body,
  timeout = 30000,
): Promise<NextResponse> {
  let body: string | undefined;
  if (request.method === "POST") {
    try {
      body = JSON.stringify(transform(await request.json()));
    } catch {
      return errorResponse("Invalid request body", 400);
    }
  }

  try {
    const response = await fetch(`${PYTHON_BACKEND_URL}${path}`, {
      method: request.method,
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(timeout),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error("Backend error:", response.status, text);
      return errorResponse(
        `Backend error: ${response.statusText}`,
        response.status,
        text,
      );
    }
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return (error as Error)?.name === "TimeoutError"
      ? errorResponse("Request timeout", 504)
      : errorResponse("Failed to connect to backend service", 502);
  }
}
