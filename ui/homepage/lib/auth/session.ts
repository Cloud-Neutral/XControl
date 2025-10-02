import { cookies } from 'next/headers'

import prisma from '../prisma'
import {
  MFA_CHALLENGE_COOKIE,
  MFA_CHALLENGE_TTL_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_REMEMBER_TTL_SECONDS,
  SESSION_TTL_SECONDS,
} from './constants'
import { generateRandomToken, hashToken } from './crypto'

export async function createSession(userId: string, remember: boolean, mfaCompleted: boolean) {
  const token = generateRandomToken()
  const tokenHash = hashToken(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + (remember ? SESSION_REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS) * 1000)

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      remember,
      mfaCompleted,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

export async function clearSessionCookie() {
  const responseCookies = cookies()
  responseCookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
}

export function setSessionCookie(token: string, expiresAt: Date) {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  })
}

export function readSessionTokenFromCookies(): string {
  return cookies().get(SESSION_COOKIE_NAME)?.value ?? ''
}

export async function findSessionByToken(token: string) {
  if (!token) {
    return null
  }
  const tokenHash = hashToken(token)
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      remember: true,
      mfaCompleted: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          status: true,
          mfaEnabled: true,
          mfaSecretEncrypted: true,
          mfaTempSecretEncrypted: true,
          mfaSecretConfirmedAt: true,
          mfaSecretIssuedAt: true,
        },
      },
    },
  })

  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => null)
    }
    return null
  }

  return session
}

export async function deleteSessionByToken(token: string) {
  if (!token) {
    return
  }
  const tokenHash = hashToken(token)
  await prisma.session.delete({ where: { tokenHash } }).catch(() => null)
}

export async function createMfaChallenge(userId: string, remember: boolean) {
  const token = generateRandomToken(24)
  const tokenHash = hashToken(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + MFA_CHALLENGE_TTL_SECONDS * 1000)

  await prisma.mfaChallenge.create({
    data: {
      userId,
      tokenHash,
      remember,
      expiresAt,
    },
  })

  cookies().set({
    name: MFA_CHALLENGE_COOKIE,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: MFA_CHALLENGE_TTL_SECONDS,
  })

  return token
}

export function clearMfaChallengeCookie() {
  cookies().set({
    name: MFA_CHALLENGE_COOKIE,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
}
