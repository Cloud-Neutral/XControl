import { NextRequest, NextResponse } from 'next/server'

import prisma from '@lib/prisma'
import { normalizeEmail } from '@lib/auth/validation'
import { verifyPassword } from '@lib/auth/password'
import {
  clearMfaChallengeCookie,
  clearSessionCookie,
  createMfaChallenge,
  createSession,
  setSessionCookie,
} from '@lib/auth/session'

export async function POST(request: NextRequest) {
  const sensitiveKeys = ['username', 'password', 'token']
  const url = new URL(request.url)
  const hasSensitiveQuery = sensitiveKeys.some((key) => url.searchParams.has(key))

  if (hasSensitiveQuery) {
    sensitiveKeys.forEach((key) => url.searchParams.delete(key))

    if (prefersJson(request)) {
      return NextResponse.json({ error: 'credentials_in_query' }, { status: 400 })
    }

    url.pathname = '/login'
    url.searchParams.set('error', 'credentials_in_query')
    return NextResponse.redirect(url, { status: 303 })
  }

  const { email, password, remember } = await extractCredentials(request)

  if (!email || !password) {
    return handleErrorResponse(request, 'missing_credentials')
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      passwordHash: true,
      status: true,
      mfaEnabled: true,
    },
  })

  if (!user) {
    return handleErrorResponse(request, 'user_not_found')
  }

  if (user.status !== 'active') {
    return handleErrorResponse(request, 'email_not_verified')
  }

  const passwordValid = await verifyPassword(user.passwordHash, password)
  if (!passwordValid) {
    return handleErrorResponse(request, 'invalid_credentials')
  }

  if (user.mfaEnabled) {
    await clearSessionCookie()
    await createMfaChallenge(user.id, remember)

    if (prefersJson(request)) {
      return NextResponse.json({ needMfa: true })
    }

    const redirectURL = new URL('/login', request.url)
    redirectURL.searchParams.set('mfa', '1')
    return NextResponse.redirect(redirectURL, { status: 303 })
  }

  const { token, expiresAt } = await createSession(user.id, remember, false)
  clearMfaChallengeCookie()
  setSessionCookie(token, expiresAt)

  if (prefersJson(request)) {
    return NextResponse.json({ success: true, mfaSetupRequired: true, redirectTo: '/panel/account?setupMfa=1' })
  }

  const redirectURL = new URL('/panel/account', request.url)
  redirectURL.searchParams.set('setupMfa', '1')
  return NextResponse.redirect(redirectURL, { status: 303 })
}

function prefersJson(request: NextRequest) {
  const accept = request.headers.get('accept')?.toLowerCase() ?? ''
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  return accept.includes('application/json') || contentType.includes('application/json')
}

async function extractCredentials(request: NextRequest) {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''

  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string
      identifier?: string
      password?: string
      remember?: boolean
    }
    return {
      email: normalizeEmail(String(body?.email ?? body?.identifier ?? '')),
      password: String(body?.password ?? ''),
      remember: Boolean(body?.remember),
    }
  }

  const formData = await request.formData()
  const email = normalizeEmail(
    String(
      formData.get('email') ??
        formData.get('identifier') ??
        formData.get('username') ??
        '',
    ),
  )
  const password = String(formData.get('password') ?? '')
  const remember = formData.get('remember') === 'on'
  return { email, password, remember }
}

function handleErrorResponse(request: NextRequest, errorCode: string) {
  if (prefersJson(request)) {
    const statusMap: Record<string, number> = {
      user_not_found: 404,
      invalid_credentials: 401,
      missing_credentials: 400,
      credentials_in_query: 400,
      email_not_verified: 403,
    }
    return NextResponse.json({ error: errorCode }, { status: statusMap[errorCode] ?? 400 })
  }

  const redirectURL = new URL('/login', request.url)
  redirectURL.searchParams.set('error', errorCode)
  return NextResponse.redirect(redirectURL, { status: 303 })
}
