import { NextRequest, NextResponse } from 'next/server'

import prisma from '@lib/prisma'
import { decryptSecret } from '@lib/auth/crypto'
import { verifyTotpCode } from '@lib/auth/totp'
import { generateRecoveryCodes, hashRecoveryCode } from '@lib/auth/recovery'
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
    code?: string
  }
  const code = String(body?.code ?? '').trim()
  if (!code) {
    return NextResponse.json({ error: 'mfa_code_required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      mfaTempSecretEncrypted: true,
      mfaSecretEncrypted: true,
    },
  })

  if (!user?.mfaTempSecretEncrypted) {
    return NextResponse.json({ error: 'mfa_setup_not_started' }, { status: 400 })
  }

  const secret = decryptSecret(user.mfaTempSecretEncrypted)
  const isValid = verifyTotpCode(secret, code)
  if (!isValid) {
    return NextResponse.json({ error: 'invalid_mfa_code' }, { status: 401 })
  }

  const recoveryCodes = generateRecoveryCodes()
  const confirmedAt = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.userId },
      data: {
        mfaEnabled: true,
        mfaSecretEncrypted: user.mfaTempSecretEncrypted,
        mfaTempSecretEncrypted: null,
        mfaSecretConfirmedAt: confirmedAt,
      },
    })

    await tx.recoveryCode.deleteMany({ where: { userId: session.userId } })
    await tx.recoveryCode.createMany({
      data: recoveryCodes.map((value) => ({
        userId: session.userId,
        codeHash: hashRecoveryCode(value),
      })),
    })
  })

  return NextResponse.json({
    success: true,
    recoveryCodes,
    user: {
      mfa: {
        totpEnabled: true,
        totpPending: false,
        totpConfirmedAt: confirmedAt.toISOString(),
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
