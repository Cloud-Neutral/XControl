import { NextRequest, NextResponse } from 'next/server'

import prisma from '@lib/prisma'
import { sendVerificationEmail } from '@lib/auth/email'
import { EMAIL_VERIFICATION_TTL_MINUTES } from '@lib/auth/constants'
import { generateVerificationCode, hashValue } from '@lib/auth/crypto'
import { hashPassword } from '@lib/auth/password'
import { normalizeEmail, normalizeUsername, validatePasswordStrength } from '@lib/auth/validation'

type RegistrationBody = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export async function POST(request: NextRequest) {
  const sensitiveKeys = ['password', 'confirmPassword', 'token']
  const url = new URL(request.url)
  const hasSensitiveQuery = sensitiveKeys.some((key) => url.searchParams.has(key))

  if (hasSensitiveQuery) {
    sensitiveKeys.forEach((key) => url.searchParams.delete(key))
    url.pathname = '/register'
    url.searchParams.set('error', 'credentials_in_query')
    return NextResponse.redirect(url, { status: 303 })
  }

  let fields: RegistrationBody
  try {
    fields = await extractRegistrationFields(request)
  } catch (error) {
    console.error('Failed to parse registration payload', error)
    const redirectURL = new URL('/register', request.url)
    redirectURL.searchParams.set('error', 'invalid_request_payload')
    return NextResponse.redirect(redirectURL, { status: 303 })
  }

  const name = fields.name.trim()
  const email = normalizeEmail(fields.email)
  const password = fields.password
  const confirmPassword = fields.confirmPassword

  if (!email || !password || !name) {
    return respondWithError(request, 'missing_fields')
  }

  if (password !== confirmPassword) {
    return respondWithError(request, 'password_mismatch')
  }

  if (!validatePasswordStrength(password)) {
    return respondWithError(request, 'weak_password')
  }

  const username = normalizeUsername(name)
  if (!username) {
    return respondWithError(request, 'invalid_name')
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: { email: true, username: true },
  })

  if (existingUser) {
    if (existingUser.email === email) {
      return respondWithError(request, 'email_already_exists')
    }
    return respondWithError(request, 'name_already_exists')
  }

  try {
    const passwordHash = await hashPassword(password)
    const verificationCode = generateVerificationCode()
    const verificationHash = hashValue(`${verificationCode}:${email}`)
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000)

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          status: 'pending',
          mfaEnabled: false,
        },
        select: { id: true },
      })

      await tx.emailVerification.deleteMany({ where: { userId: user.id } })
      await tx.emailVerification.create({
        data: {
          userId: user.id,
          codeHash: verificationHash,
          expiresAt,
        },
      })
    })

    await sendVerificationEmail(email, verificationCode)
  } catch (error) {
    console.error('Failed to create user during registration', error)
    return respondWithError(request, 'user_creation_failed')
  }

  if (prefersJson(request)) {
    return NextResponse.json({ success: true, message: 'verification_sent' })
  }

  const redirectURL = new URL('/login', request.url)
  redirectURL.searchParams.set('verify', '1')
  return NextResponse.redirect(redirectURL, { status: 303 })
}

function ensureString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

async function extractRegistrationFields(request: NextRequest): Promise<RegistrationBody> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''

  if (contentType.includes('application/json')) {
    const body = await request.json().catch((error) => {
      console.error('Failed to decode JSON body', error)
      throw error
    })
    return {
      name: ensureString(body?.name ?? ''),
      email: ensureString(body?.email ?? ''),
      password: ensureString(body?.password ?? ''),
      confirmPassword: ensureString(body?.confirmPassword ?? body?.password ?? ''),
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text()
    const params = new URLSearchParams(text)
    return {
      name: ensureString(params.get('name')),
      email: ensureString(params.get('email')),
      password: ensureString(params.get('password')),
      confirmPassword: ensureString(params.get('confirmPassword')),
    }
  }

  const formData = await request.formData()
  const read = (key: string) => ensureString(formData.get(key))
  return {
    name: read('name'),
    email: read('email'),
    password: read('password'),
    confirmPassword: read('confirmPassword'),
  }
}

export function GET() {
  return NextResponse.json(
    { error: 'method_not_allowed' },
    {
      status: 405,
      headers: {
        Allow: 'POST',
      },
    },
  )
}

function prefersJson(request: NextRequest) {
  const accept = request.headers.get('accept')?.toLowerCase() ?? ''
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  return accept.includes('application/json') || contentType.includes('application/json')
}

function respondWithError(request: NextRequest, errorCode: string) {
  if (prefersJson(request)) {
    return NextResponse.json({ error: errorCode }, { status: 400 })
  }

  const redirectURL = new URL('/register', request.url)
  redirectURL.searchParams.set('error', errorCode)
  return NextResponse.redirect(redirectURL, { status: 303 })
}
