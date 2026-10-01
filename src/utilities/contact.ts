import type { SiteLocale } from '@/i18n/config'

export const contactTopics = [
  'correction',
  'source',
  'signal',
  'partnership',
  'general',
] as const

export type ContactTopic = (typeof contactTopics)[number]

export type ContactRequest = {
  email: string
  locale: SiteLocale
  message: string
  name: string
  sourceUrl?: string
  topic: ContactTopic
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function cleanMultilineText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\r\n/g, '\n').slice(0, maxLength)
}

export function parseContactRequest(input: unknown): ContactRequest | null {
  if (!input || typeof input !== 'object') return null

  const body = input as Record<string, unknown>

  // Honeypot. Bots that fill this field are treated as invalid.
  if (cleanText(body.website, 160)) return null

  const name = cleanText(body.name, 120)
  const email = cleanText(body.email, 254).toLowerCase()
  const message = cleanMultilineText(body.message, 5000)
  const sourceUrl = cleanText(body.sourceUrl, 500)
  const locale = body.locale === 'en' ? 'en' : body.locale === 'fr' ? 'fr' : null
  const topic = contactTopics.includes(body.topic as ContactTopic)
    ? (body.topic as ContactTopic)
    : null

  if (!name || name.length < 2) return null
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return null
  if (!message || message.length < 20) return null
  if (!locale || !topic) return null

  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) return null

  return {
    email,
    locale,
    message,
    name,
    sourceUrl: sourceUrl || undefined,
    topic,
  }
}
