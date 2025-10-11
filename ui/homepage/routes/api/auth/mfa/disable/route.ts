import { SESSION_COOKIE_NAME, clearSessionCookie } from '@lib/authGateway'
import { getRequestCookies, jsonResponse } from '@lib/http'
import { getAccountServiceBaseUrl } from '@lib/serviceConfig'

const ACCOUNT_SERVICE_URL = getAccountServiceBaseUrl()
const ACCOUNT_API_BASE = `${ACCOUNT_SERVICE_URL}/api/auth`

export async function POST(request: Request) {
  const token = getRequestCookies(request)[SESSION_COOKIE_NAME]?.trim()

  if (!token) {
    return jsonResponse({ success: false, error: 'session_required' }, { status: 401 })
  }

  try {
    const response = await fetch(`${ACCOUNT_API_BASE}/mfa/disable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const errorCode = typeof (data as { error?: string })?.error === 'string' ? data.error : 'mfa_disable_failed'
      if (response.status === 401) {
        const result = jsonResponse({ success: false, error: errorCode })
        clearSessionCookie(result)
        return result
      }
      return jsonResponse({ success: false, error: errorCode }, { status: response.status || 400 })
    }

    return jsonResponse({ success: true, error: null, data })
  } catch (error) {
    console.error('Account service MFA disable proxy failed', error)
    return jsonResponse({ success: false, error: 'account_service_unreachable' }, { status: 502 })
  }
}

export function GET() {
  return jsonResponse(
    { success: false, error: 'method_not_allowed' },
    {
      status: 405,
      headers: {
        Allow: 'POST',
      },
    },
  )
}
