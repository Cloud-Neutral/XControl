import { getCookies } from 'jsr:@std/http@1.0.7/cookie'

export type JsonResponseInit = ResponseInit & { headers?: HeadersInit }

export function jsonResponse<T>(data: T, init: JsonResponseInit = {}): Response {
  const headers = new Headers(init.headers ?? {})
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json; charset=utf-8')
  }
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  })
}

export function getRequestCookies(request: Request): Record<string, string> {
  return getCookies(request.headers)
}

