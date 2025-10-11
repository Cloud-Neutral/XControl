import { setCookie } from '@std/http@^1.0.7/cookie'

export const SESSION_COOKIE_NAME = 'xc_session'
export const MFA_COOKIE_NAME = 'xc_mfa_challenge'

const SESSION_DEFAULT_MAX_AGE = 60 * 60 * 24 // 24 hours
const MFA_DEFAULT_MAX_AGE = 60 * 10 // 10 minutes

type EnvReader = { env?: { get?(name: string): string | undefined } }

function readEnvValue(key: string): string | undefined {
  const denoEnv = (globalThis as { Deno?: EnvReader }).Deno?.env
  const denoValue = denoEnv?.get?.(key)
  if (typeof denoValue === 'string') {
    const trimmed = denoValue.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }

  const nodeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  const nodeValue = nodeProcess?.env?.[key]
  if (typeof nodeValue === 'string') {
    const trimmed = nodeValue.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }

  return undefined
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false
  }
  return undefined
}

function shouldUseSecureCookies(): boolean {
  const explicit =
    parseBoolean(readEnvValue('SESSION_COOKIE_SECURE')) ??
    parseBoolean(readEnvValue('NEXT_PUBLIC_SESSION_COOKIE_SECURE'))
  if (explicit !== undefined) {
    return explicit
  }

  if (readEnvValue('NODE_ENV') === 'production') {
    return true
  }

  const baseUrl =
    readEnvValue('NEXT_PUBLIC_APP_BASE_URL') ??
    readEnvValue('APP_BASE_URL') ??
    readEnvValue('NEXT_PUBLIC_SITE_URL')

  if (typeof baseUrl === 'string' && baseUrl.toLowerCase().startsWith('https://')) {
    return true
  }

  return false
}

const secureCookieBase = {
  httpOnly: true,
  secure: shouldUseSecureCookies(),
  sameSite: 'Strict' as const,
  path: '/',
}

export function applySessionCookie(response: Response, token: string, maxAge?: number) {
  const resolvedMaxAge = Number.isFinite(maxAge) && maxAge && maxAge > 0 ? Math.floor(maxAge) : SESSION_DEFAULT_MAX_AGE
  setCookie(response.headers, {
    name: SESSION_COOKIE_NAME,
    value: token,
    ...secureCookieBase,
    maxAge: resolvedMaxAge,
  })
}

export function clearSessionCookie(response: Response) {
  setCookie(response.headers, {
    name: SESSION_COOKIE_NAME,
    value: '',
    ...secureCookieBase,
    maxAge: 0,
  })
}

export function applyMfaCookie(response: Response, token: string, maxAge?: number) {
  const resolvedMaxAge = Number.isFinite(maxAge) && maxAge && maxAge > 0 ? Math.floor(maxAge) : MFA_DEFAULT_MAX_AGE
  setCookie(response.headers, {
    name: MFA_COOKIE_NAME,
    value: token,
    ...secureCookieBase,
    maxAge: resolvedMaxAge,
  })
}

export function clearMfaCookie(response: Response) {
  setCookie(response.headers, {
    name: MFA_COOKIE_NAME,
    value: '',
    ...secureCookieBase,
    maxAge: 0,
  })
}

export function deriveMaxAgeFromExpires(expiresAt?: string | number | Date | null, fallback = SESSION_DEFAULT_MAX_AGE) {
  if (!expiresAt) {
    return fallback
  }

  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt)
  const msUntilExpiry = date.getTime() - Date.now()
  if (!Number.isFinite(msUntilExpiry) || msUntilExpiry <= 0) {
    return fallback
  }
  return Math.floor(msUntilExpiry / 1000)
}
