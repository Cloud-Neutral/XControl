import { randomBytes } from 'crypto'

import { hashValue } from './crypto'

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => createRecoveryCode())
}

function createRecoveryCode(): string {
  const raw = randomBytes(8).toString('hex')
  return raw.slice(0, 4) + '-' + raw.slice(4, 8)
}

export function hashRecoveryCode(code: string): string {
  return hashValue(code.toLowerCase())
}
