import { authenticator } from 'otplib'

authenticator.options = {
  step: 30,
  window: 1,
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret()
}

export function createOtpAuthUri(secret: string, account: string, issuer: string): string {
  return authenticator.keyuri(account, issuer, secret)
}

export function verifyTotpCode(secret: string, code: string): boolean {
  if (!/^[0-9]{6}$/.test(code)) {
    return false
  }
  return authenticator.check(code, secret)
}
