export type CookieSameSite = 'Strict' | 'Lax' | 'None'

export interface Cookie {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: Date
  maxAge?: number
  secure?: boolean
  httpOnly?: boolean
  sameSite?: CookieSameSite
  unparsed?: string[]
}

function serializeCookie(cookie: Cookie): string {
  const segments = [`${cookie.name}=${cookie.value}`]
  if (cookie.domain) segments.push(`Domain=${cookie.domain}`)
  if (cookie.path) segments.push(`Path=${cookie.path}`)
  if (cookie.expires) segments.push(`Expires=${cookie.expires.toUTCString()}`)
  if (typeof cookie.maxAge === 'number') segments.push(`Max-Age=${Math.floor(cookie.maxAge)}`)
  if (cookie.secure) segments.push('Secure')
  if (cookie.httpOnly) segments.push('HttpOnly')
  if (cookie.sameSite) segments.push(`SameSite=${cookie.sameSite}`)
  if (cookie.unparsed) segments.push(...cookie.unparsed)
  return segments.join('; ')
}

export function setCookie(headers: Headers, cookie: Cookie): void {
  headers.append('Set-Cookie', serializeCookie(cookie))
}

export function getCookies(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}
  const cookieHeader = headers.get('cookie')
  if (!cookieHeader) {
    return result
  }

  const pairs = cookieHeader.split(';')
  for (const pair of pairs) {
    const [rawName, ...rest] = pair.split('=')
    const name = rawName?.trim()
    if (!name) continue
    const value = rest.join('=').trim()
    result[name] = value
  }
  return result
}
