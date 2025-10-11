import { MFA_COOKIE_NAME, SESSION_COOKIE_NAME } from '@lib/authGateway'
import { getRequestCookies, jsonResponse } from '@lib/http'
import { getAccountServiceBaseUrl } from '@lib/serviceConfig'

const ACCOUNT_SERVICE_URL = getAccountServiceBaseUrl()
const ACCOUNT_API_BASE = `${ACCOUNT_SERVICE_URL}/api/auth`

export async function GET(request: Request) {
  const cookieStore = getRequestCookies(request)
  const sessionToken = cookieStore[SESSION_COOKIE_NAME] ?? ''
  const storedMfaToken = cookieStore[MFA_COOKIE_NAME] ?? ''

  const url = new URL(request.url)
  const queryToken = String(url.searchParams.get('token') ?? '').trim()
  const token = queryToken || storedMfaToken
  const identifier = String(
    url.searchParams.get('identifier') ?? url.searchParams.get('email') ?? '',
  ).trim()

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`
  }

  const params = new URLSearchParams()
  if (token) {
    params.set('token', token)
  }
  if (identifier) {
    params.set('identifier', identifier.toLowerCase())
  }

  const endpointParams = params.toString()
  const endpoint = endpointParams
    ? `${ACCOUNT_API_BASE}/mfa/status?${endpointParams}`
    : `${ACCOUNT_API_BASE}/mfa/status`

  const response = await fetch(endpoint, {
    method: 'GET',
    headers,
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => ({}))
  return jsonResponse(payload, { status: response.status })
}
