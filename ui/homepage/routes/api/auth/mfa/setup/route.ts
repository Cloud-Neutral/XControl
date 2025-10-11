import { applyMfaCookie, MFA_COOKIE_NAME, SESSION_COOKIE_NAME } from '@lib/authGateway'
import { getRequestCookies, jsonResponse } from '@lib/http'
import { getAccountServiceBaseUrl } from '@lib/serviceConfig'

const ACCOUNT_SERVICE_URL = getAccountServiceBaseUrl()
const ACCOUNT_API_BASE = `${ACCOUNT_SERVICE_URL}/api/auth`

// This Next.js route proxies MFA provisioning requests to the account service.
// The UI calls /api/auth/mfa/setup, which in turn forwards to the Go backend
// at /api/auth/mfa/totp/provision, keeping browser credentials opaque to the
// external service and letting us manage cookies centrally.

type SetupPayload = {
  token?: string
  issuer?: string
  account?: string
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  const cookieStore = getRequestCookies(request)
  let payload: SetupPayload
  try {
    payload = (await request.json()) as SetupPayload
  } catch (error) {
    console.error('Failed to decode MFA setup payload', error)
    return jsonResponse({ success: false, error: 'invalid_request', needMfa: true }, { status: 400 })
  }

  const sessionToken = cookieStore[SESSION_COOKIE_NAME] ?? ''
  const cookieToken = cookieStore[MFA_COOKIE_NAME] ?? ''
  const token = normalizeString(payload?.token || cookieToken)

  if (!token && !sessionToken) {
    return jsonResponse({ success: false, error: 'mfa_token_required', needMfa: true }, { status: 400 })
  }

  const issuer = normalizeString(payload?.issuer)
  const account = normalizeString(payload?.account)

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`
    }

    const body: Record<string, string> = {}
    if (token) {
      body.token = token
    }
    if (issuer) {
      body.issuer = issuer
    }
    if (account) {
      body.account = account
    }

    const response = await fetch(`${ACCOUNT_API_BASE}/mfa/totp/provision`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const errorCode = typeof (data as { error?: string })?.error === 'string' ? data.error : 'mfa_setup_failed'
      return jsonResponse({ success: false, error: errorCode, needMfa: true }, { status: response.status || 400 })
    }

    const result = jsonResponse({ success: true, error: null, needMfa: true, data })
    const nextToken = normalizeString((data as { mfaToken?: string })?.mfaToken || token || cookieToken)
    if (nextToken) {
      applyMfaCookie(result, nextToken)
    }
    return result
  } catch (error) {
    console.error('Account service MFA setup proxy failed', error)
    return jsonResponse({ success: false, error: 'account_service_unreachable', needMfa: true }, { status: 502 })
  }
}

export function GET() {
  return jsonResponse(
    { success: false, error: 'method_not_allowed', needMfa: true },
    {
      status: 405,
      headers: {
        Allow: 'POST',
      },
    },
  )
}
