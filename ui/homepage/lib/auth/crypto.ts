import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

import { MFA_ENCRYPTION_IV_LENGTH } from './constants'

function resolveEncryptionKey(): Buffer {
  const raw = process.env.AUTH_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_AUTH_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('AUTH_ENCRYPTION_KEY environment variable must be configured')
  }
  return createHash('sha256').update(raw).digest()
}

export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function hashToken(token: string): string {
  return hashValue(token)
}

export function encryptSecret(secret: string): string {
  const key = resolveEncryptionKey()
  const iv = randomBytes(MFA_ENCRYPTION_IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decryptSecret(payload: string): string {
  const buffer = Buffer.from(payload, 'base64')
  const iv = buffer.subarray(0, MFA_ENCRYPTION_IV_LENGTH)
  const authTag = buffer.subarray(MFA_ENCRYPTION_IV_LENGTH, MFA_ENCRYPTION_IV_LENGTH + 16)
  const encrypted = buffer.subarray(MFA_ENCRYPTION_IV_LENGTH + 16)
  const key = resolveEncryptionKey()
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function generateVerificationCode(): string {
  const code = randomBytes(3).readUIntBE(0, 3) % 1_000_000
  return code.toString().padStart(6, '0')
}
