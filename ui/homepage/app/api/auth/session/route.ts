import { NextRequest, NextResponse } from 'next/server'

import {
  clearMfaChallengeCookie,
  clearSessionCookie,
  deleteSessionByToken,
  findSessionByToken,
  readSessionTokenFromCookies,
} from '@lib/auth/session'

export async function GET(request: NextRequest) {
  void request
  const token = readSessionTokenFromCookies()
  if (!token) {
    return NextResponse.json({ user: null })
  }

  const session = await findSessionByToken(token)
  if (!session) {
    await clearSessionCookie()
    return NextResponse.json({ user: null })
  }

  const user = session.user
  const identifier = user.id
  const responsePayload = {
    user: {
      id: identifier,
      uuid: identifier,
      email: user.email,
      username: user.username ?? user.email,
      mfaEnabled: user.mfaEnabled,
      mfa: {
        totpEnabled: user.mfaEnabled,
        totpPending: Boolean(user.mfaTempSecretEncrypted && !user.mfaEnabled),
        totpSecretIssuedAt: user.mfaSecretIssuedAt?.toISOString(),
        totpConfirmedAt: user.mfaSecretConfirmedAt?.toISOString(),
      },
    },
  }

  return NextResponse.json(responsePayload)
}

export async function DELETE(request: NextRequest) {
  void request
  const token = readSessionTokenFromCookies()
  if (token) {
    await deleteSessionByToken(token)
  }
  clearMfaChallengeCookie()
  await clearSessionCookie()
  return NextResponse.json({ success: true })
}
