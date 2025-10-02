import { NextRequest, NextResponse } from 'next/server'

import prisma from '@lib/prisma'
import { encryptSecret } from '@lib/auth/crypto'
import { generateTotpSecret, createOtpAuthUri } from '@lib/auth/totp'
import { findSessionByToken, readSessionTokenFromCookies } from '@lib/auth/session'

export async function POST(request: NextRequest) {
  const sessionToken = readSessionTokenFromCookies()
  if (!sessionToken) {
    return NextResponse.json({ error: 'authentication_required' }, { status: 401 })
  }

  const session = await findSessionByToken(sessionToken)
  if (!session) {
    return NextResponse.json({ error: 'authentication_required' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    issuer?: string
    account?: string
  }

  const secret = generateTotpSecret()
  const encryptedSecret = encryptSecret(secret)
  const issuedAt = new Date()

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      mfaTempSecretEncrypted: encryptedSecret,
      mfaSecretIssuedAt: issuedAt,
    },
  })

  const issuer = body?.issuer?.trim() || 'XControl'
  const account = body?.account?.trim() || session.user.email
  const uri = createOtpAuthUri(secret, account, issuer)

  return NextResponse.json({
    secret,
    uri,
    issuer,
    account,
    user: {
      mfa: {
        totpPending: true,
        totpEnabled: session.user.mfaEnabled,
        totpSecretIssuedAt: issuedAt.toISOString(),
      },
    },
  })
}

export function GET() {
  return NextResponse.json(
    { error: 'method_not_allowed' },
    {
      status: 405,
      headers: { Allow: 'POST' },
    },
  )
}
