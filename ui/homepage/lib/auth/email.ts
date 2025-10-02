export async function sendVerificationEmail(email: string, _code: string): Promise<void> {
  // Replace this stub with a real email delivery integration.
  // We deliberately avoid logging the verification code for security reasons.
  console.info('Queued verification email for %s', email)
}
