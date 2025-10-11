import { SESSION_COOKIE_NAME, clearSessionCookie } from '@lib/authGateway'
import { getRequestCookies, jsonResponse } from '@lib/http'
import { getAccountServiceBaseUrl } from '@lib/serviceConfig'

const ACCOUNT_SERVICE_URL = getAccountServiceBaseUrl()
const ACCOUNT_API_BASE = `${ACCOUNT_SERVICE_URL}/api/auth`

type AccountUser = {
  id?: string
  uuid?: string
  name?: string
  username?: string
  email: string
  mfaEnabled?: boolean
  mfaPending?: boolean
  mfa?: {
    totpEnabled?: boolean
    totpPending?: boolean
    totpSecretIssuedAt?: string
    totpConfirmedAt?: string
    totpLockedUntil?: string
  }
  role?: string
  groups?: string[]
  permissions?: string[]
  tenantId?: string
  tenants?: Array<{
    id?: string
    name?: string
    role?: string
  }>
}

type SessionResponse = {
  user?: AccountUser | null
  error?: string
}

async function fetchSession(token: string) {
  try {
    const response = await fetch(`${ACCOUNT_API_BASE}/session`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    const data = (await response.json().catch(() => ({}))) as SessionResponse
    return { response, data }
  } catch (error) {
    console.error('Session lookup proxy failed', error)
    return { response: null, data: null }
  }
}

export async function GET(request: Request) {
  const token = getRequestCookies(request)[SESSION_COOKIE_NAME]
  if (!token) {
    return jsonResponse({ user: null })
  }

  const { response, data } = await fetchSession(token)
  if (!response || !response.ok || !data?.user) {
    const res = jsonResponse({ user: null })
    clearSessionCookie(res)
    return res
  }

  const rawUser = data.user as AccountUser
  const identifier =
    typeof rawUser.uuid === 'string' && rawUser.uuid.trim().length > 0
      ? rawUser.uuid.trim()
      : typeof rawUser.id === 'string'
        ? rawUser.id.trim()
        : undefined

  const rawMfa = rawUser.mfa ?? {}
  const derivedMfaEnabled = Boolean(rawUser.mfaEnabled ?? rawMfa.totpEnabled)
  const derivedMfaPendingSource =
    typeof rawUser.mfaPending === 'boolean'
      ? rawUser.mfaPending
      : typeof rawMfa.totpPending === 'boolean'
        ? rawMfa.totpPending
        : false
  const derivedMfaPending = derivedMfaPendingSource && !derivedMfaEnabled

  const normalizedRole =
    typeof rawUser.role === 'string' && rawUser.role.trim().length > 0
      ? rawUser.role.trim().toLowerCase()
      : 'user'
  const normalizedGroups = Array.isArray(rawUser.groups)
    ? rawUser.groups
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim())
    : []
  const normalizedPermissions = Array.isArray(rawUser.permissions)
    ? rawUser.permissions
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim())
    : []
  const normalizedTenantId =
    typeof rawUser.tenantId === 'string' && rawUser.tenantId.trim().length > 0
      ? rawUser.tenantId.trim()
      : undefined
  const normalizedTenants = Array.isArray(rawUser.tenants)
    ? rawUser.tenants
        .map((tenant) => {
          if (!tenant || typeof tenant !== 'object') {
            return null
          }

          const identifier =
            typeof tenant.id === 'string' && tenant.id.trim().length > 0
              ? tenant.id.trim()
              : undefined
          if (!identifier) {
            return null
          }

          const label =
            typeof tenant.name === 'string' && tenant.name.trim().length > 0
              ? tenant.name.trim()
              : undefined
          const roleValue =
            typeof tenant.role === 'string' && tenant.role.trim().length > 0
              ? tenant.role.trim().toLowerCase()
              : undefined
          return {
            id: identifier,
            name: label,
            role: roleValue,
          }
        })
        .filter((tenant): tenant is { id: string; name?: string; role?: string } => Boolean(tenant))
    : undefined

  const normalizedMfa = Object.keys(rawMfa).length
    ? {
        ...rawMfa,
        totpEnabled: Boolean(rawMfa.totpEnabled ?? derivedMfaEnabled),
        totpPending: Boolean(rawMfa.totpPending ?? derivedMfaPending),
      }
    : {
        totpEnabled: derivedMfaEnabled,
        totpPending: derivedMfaPending,
      }

  const normalizedUser = identifier ? { ...rawUser, id: identifier, uuid: identifier } : rawUser

  return jsonResponse({
    user: {
      ...normalizedUser,
      mfaEnabled: derivedMfaEnabled,
      mfaPending: derivedMfaPending,
      mfa: normalizedMfa,
      role: normalizedRole,
      groups: normalizedGroups,
      permissions: normalizedPermissions,
      tenantId: normalizedTenantId,
      tenants: normalizedTenants,
    },
  })
}

export async function DELETE(request: Request) {
  const token = getRequestCookies(request)[SESSION_COOKIE_NAME]
  if (token) {
    await fetch(`${ACCOUNT_API_BASE}/session`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }).catch(() => null)
  }

  const response = jsonResponse({ success: true })
  clearSessionCookie(response)
  return response
}
