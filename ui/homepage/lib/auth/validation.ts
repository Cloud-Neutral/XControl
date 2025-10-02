export function validatePasswordStrength(password: string): boolean {
  if (password.length < 12) {
    return false
  }
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  return hasUpper && hasLower && hasNumber && hasSymbol
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}
