export type NewsletterRequest = {
  email: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseNewsletterRequest(input: unknown): NewsletterRequest | null {
  if (!input || typeof input !== 'object') return null

  const { email: rawEmail, website } = input as Record<string, unknown>

  if (typeof website === 'string' && website.trim()) return null
  if (typeof rawEmail !== 'string') return null

  const email = rawEmail.trim().toLowerCase()

  return emailPattern.test(email) ? { email } : null
}
