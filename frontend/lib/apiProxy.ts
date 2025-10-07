import { NextRequest, NextResponse } from 'next/server'

interface ProxyOptions {
  method?: 'GET' | 'POST'
  backendUrl: string
  forwardCookies?: boolean
  transformRequest?: (body: any) => any
  validateRequest?: (body: any) => { valid: boolean; error?: string }
  onSuccess?: (data: any, response: Response) => NextResponse
  logRequests?: boolean
}

interface ErrorResponse {
  success: false
  error: string
  details?: string
}

/**
 * Shared API proxy handler for forwarding requests to Python backend
 * Handles common error patterns, cookie forwarding, and response transformation
 */
export async function proxyToPythonBackend(
  request: NextRequest,
  options: ProxyOptions
): Promise<NextResponse> {
  const {
    method = 'POST',
    backendUrl,
    forwardCookies = false,
    transformRequest,
    validateRequest,
    onSuccess,
    logRequests = false
  } = options

  try {
    // Parse request body for POST requests
    let body: any = null
    if (method === 'POST') {
      body = await request.json()

      if (logRequests) {
        console.log(`${method} ${backendUrl} called`)
        console.log('Request body:', JSON.stringify(body, null, 2))
      }

      // Validate request if validator provided
      if (validateRequest) {
        const validation = validateRequest(body)
        if (!validation.valid) {
          return createErrorResponse(
            validation.error || 'Invalid request',
            'Request validation failed',
            400
          )
        }
      }

      // Transform request if transformer provided
      if (transformRequest) {
        body = transformRequest(body)
        if (logRequests) {
          console.log('Transformed request:', JSON.stringify(body, null, 2))
        }
      }
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Forward session cookie if requested
    if (forwardCookies) {
      const sessionCookie = request.cookies.get('session')?.value
      if (sessionCookie) {
        headers['Cookie'] = `session=${sessionCookie}`
      }
    }

    if (logRequests) {
      console.log('Forwarding to:', backendUrl)
    }

    // Make request to backend
    const fetchOptions: RequestInit = {
      method,
      headers,
      ...(method === 'POST' && body ? { body: JSON.stringify(body) } : {}),
      ...(forwardCookies ? { credentials: 'include' as RequestCredentials } : {})
    }

    const response = await fetch(backendUrl, fetchOptions)

    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error:', response.status, errorText)
      return createErrorResponse(
        `Backend error: ${response.statusText}`,
        errorText,
        response.status
      )
    }

    // Parse response
    const data = await response.json()

    if (logRequests) {
      console.log('Backend response:', JSON.stringify(data, null, 2))
    }

    // Use custom success handler if provided
    if (onSuccess) {
      return onSuccess(data, response)
    }

    // Default: create response and forward cookies if needed
    const nextResponse = NextResponse.json(data)

    if (forwardCookies) {
      const setCookieHeader = response.headers.get('set-cookie')
      if (setCookieHeader) {
        nextResponse.headers.set('set-cookie', setCookieHeader)
      }
    }

    return nextResponse

  } catch (error) {
    console.error('Proxy error:', error)
    return createErrorResponse(
      'Failed to connect to backend service',
      error instanceof Error ? error.message : 'Unknown error',
      500
    )
  }
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  error: string,
  details?: string,
  status: number = 500
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details ? { details } : {})
    },
    { status }
  )
}

/**
 * Standard OPTIONS handler for CORS
 */
export function handleOptionsRequest(allowedMethods: string[] = ['GET', 'POST', 'OPTIONS']): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': allowedMethods.join(', '),
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

/**
 * Health check helper for Python backend
 */
export async function checkBackendHealth(backendUrl: string): Promise<boolean> {
  try {
    const healthCheck = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    return healthCheck.ok
  } catch {
    return false
  }
}
