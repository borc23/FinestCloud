import { NextRequest } from 'next/server'
import { proxyToPythonBackend } from '../../../../lib/apiProxy'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  return proxyToPythonBackend(request, {
    method: 'POST',
    backendUrl: `${BACKEND_URL}/api/pvwatts/calculate_system`
  })
}
