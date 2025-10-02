import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import prisma from '@lib/prisma'
import { MFA_CHALLENGE_COOKIE } from '@lib/auth/constants'
import { hashToken } from '@lib/auth/crypto'
import { findSessionByToken, readSessionTokenFromCookies } from '@lib/auth/session'

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const sessionToken = readSessionTokenFromCookies()
  const storedMfaToken = cookieStore.get(MFA_CHALLENGE_COOKIE)?.value ?? ''

  const url = new URL(request.url)
  const queryToken = String(url.searchParams.get('token') ?? '').trim()
  const challengeToken = queryToken || storedMfaToken

  const payload: Record<string, unknown> = {}

  if (sessionToken) {
    const session = await findSessionByToken(sessionToken)
    if (session) {
      payload.user = {
        mfa: {
          totpEnabled: session.user.mfaEnabled,
          totpPending: Boolean(session.user.mfaTempSecretEncrypted && !session.user.mfaEnabled),
          totpSecretIssuedAt: session.user.mfaSecretIssuedAt?.toISOString(),
          totpConfirmedAt: session.user.mfaSecretConfirmedAt?.toISOString(),
        },
      }
    }
  }

  if (challengeToken) {
    const tokenHash = hashToken(challengeToken)
    const challenge = await prisma.mfaChallenge.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        user: {
          select: {
            mfaEnabled: true,
            mfaTempSecretEncrypted: true,
            mfaSecretIssuedAt: true,
            mfaSecretConfirmedAt: true,
          },
        },
      },
    })

    if (challenge) {
      payload.mfa = {
        totpEnabled: challenge.user.mfaEnabled,
        totpPending: Boolean(challenge.user.mfaTempSecretEncrypted && !challenge.user.mfaEnabled),
        totpSecretIssuedAt: challenge.user.mfaSecretIssuedAt?.toISOString(),
        totpConfirmedAt: challenge.user.mfaSecretConfirmedAt?.toISOString(),
      }
      payload.mfaToken = challengeToken
    }
  }

  return NextResponse.json(payload)
}

export function POST() {
  return NextResponse.json(
    { error: 'method_not_allowed' },
    {
      status: 405,
      headers: { Allow: 'GET' },
    },
  )
}
