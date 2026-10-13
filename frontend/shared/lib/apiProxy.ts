import { NextRequest, NextResponse } from "next/server";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";
// Shared secret the backend requires on /api/* (see finestcloud/core/security.py)
const BACKEND_API_TOKEN = process.env.BACKEND_API_TOKEN;

/** Standard error shape: { success: false, error, details? } */
export function errorResponse(error: string, status: number, details?: string) {
  return NextResponse.json(
    { success: false, error, ...(details ? { details } : {}) },
    { status },
  );
}

/**
 * Forward a request to the Python backend (POST bodies are JSON, optionally
 * transformed) and relay its body, status and content type. Callers must run
 * guardApiCall first: the backend trusts whatever this server sends it.
 */
export async function proxyToPythonBackend(
  request: NextRequest,
  path: string,
  transform: (body: any) => unknown = (body) => body,
  timeout = 30000,
): Promise<NextResponse> {
  if (!BACKEND_API_TOKEN) {
    console.error("BACKEND_API_TOKEN is not set");
    return errorResponse("Backend not configured", 500);
  }

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
      headers: {
        "Content-Type": "application/json",
        "X-Backend-Token": BACKEND_API_TOKEN,
      },
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

/** Whether the backend answers its (public) health check within the timeout. */
export async function isBackendUp(timeout = 5000): Promise<boolean> {
  try {
    const response = await fetch(`${PYTHON_BACKEND_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
    });
    return response.ok;
  } catch {
    return false;
  }
}
