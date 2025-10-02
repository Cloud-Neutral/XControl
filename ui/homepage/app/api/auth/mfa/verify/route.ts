import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import prisma from '@lib/prisma'
import { MFA_CHALLENGE_COOKIE } from '@lib/auth/constants'
import { decryptSecret, hashToken } from '@lib/auth/crypto'
import { verifyTotpCode } from '@lib/auth/totp'
import { generateRecoveryCodes, hashRecoveryCode } from '@lib/auth/recovery'
import { clearMfaChallengeCookie, createSession, setSessionCookie } from '@lib/auth/session'

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    code?: string
    token?: string
    remember?: boolean
    recoveryCode?: string
  }

  const cookieStore = cookies()
  const fallbackToken = cookieStore.get(MFA_CHALLENGE_COOKIE)?.value ?? ''
  const token = String(body?.token ?? fallbackToken ?? '').trim()
  const code = String(body?.code ?? '').trim()
  const recoveryCode = String(body?.recoveryCode ?? '').trim()

  if (!token) {
    return NextResponse.json({ error: 'mfa_token_required' }, { status: 400 })
  }

  if (!code && !recoveryCode) {
    return NextResponse.json({ error: 'mfa_code_required' }, { status: 400 })
  }

  const tokenHash = hashToken(token)
  const challenge = await prisma.mfaChallenge.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, remember: true, expiresAt: true },
  })

  if (!challenge) {
    return NextResponse.json({ error: 'mfa_token_invalid' }, { status: 404 })
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    await prisma.mfaChallenge.delete({ where: { id: challenge.id } }).catch(() => null)
    clearMfaChallengeCookie()
    return NextResponse.json({ error: 'mfa_token_expired' }, { status: 410 })
  }

  const user = await prisma.user.findUnique({
    where: { id: challenge.userId },
    select: {
      id: true,
      mfaSecretEncrypted: true,
      mfaEnabled: true,
      email: true,
    },
  })

  if (!user?.mfaEnabled || !user.mfaSecretEncrypted) {
    await prisma.mfaChallenge.delete({ where: { id: challenge.id } }).catch(() => null)
    clearMfaChallengeCookie()
    return NextResponse.json({ error: 'mfa_not_enabled' }, { status: 400 })
  }

  const secret = decryptSecret(user.mfaSecretEncrypted)
  let recoveryUsed = false
  let valid = false

  if (code) {
    valid = verifyTotpCode(secret, code)
  }

  if (!valid && recoveryCode) {
    const hashedRecovery = hashRecoveryCode(recoveryCode)
    const recovery = await prisma.recoveryCode.findFirst({
      where: {
        userId: user.id,
        codeHash: hashedRecovery,
        usedAt: null,
      },
    })

    if (recovery) {
      recoveryUsed = true
      valid = true
      await prisma.recoveryCode.update({
        where: { id: recovery.id },
        data: { usedAt: new Date() },
      })
    }
  }

  if (!valid) {
    return NextResponse.json({ error: 'invalid_mfa_code' }, { status: 401 })
  }

  await prisma.mfaChallenge.delete({ where: { id: challenge.id } }).catch(() => null)

  const { token: sessionToken, expiresAt } = await createSession(user.id, challenge.remember, true)
  clearMfaChallengeCookie()
  setSessionCookie(sessionToken, expiresAt)

  const responsePayload: Record<string, unknown> = {
    success: true,
    redirectTo: '/',
  }

  if (recoveryUsed) {
    const replacementCodes = generateRecoveryCodes()
    await prisma.$transaction(async (tx) => {
      await tx.recoveryCode.deleteMany({ where: { userId: user.id } })
      await tx.recoveryCode.createMany({
        data: replacementCodes.map((value) => ({
          userId: user.id,
          codeHash: hashRecoveryCode(value),
        })),
      })
    })
    responsePayload.recoveryCodes = replacementCodes
  }

  return NextResponse.json(responsePayload)
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
