import { NextRequest } from 'next/server'
import { proxyToPythonBackend } from '@/shared/lib/apiProxy'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  return proxyToPythonBackend(request, {
    method: 'POST',
    backendUrl: `${PYTHON_BACKEND_URL}/api/pvwatts/calculate`
  })
}
