import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'

// Vercel sets this header at its trusted ingress. Never accept an IP from JSON,
// an arbitrary Forwarded header, or an unconfigured self-hosted proxy.
export function clientIP(headers: Headers): string | null {
  if (process.env.VERCEL_ENV !== 'production') return null
  const value = headers.get('x-vercel-forwarded-for')?.trim()
  if (!value || !isIP(value)) return null
  if (isIP(value) === 4) return value
  const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1)
  const mapped = canonical.match(/^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/)
  if (!mapped) return canonical
  const high = parseInt(mapped[1], 16)
  const low = parseInt(mapped[2], 16)
  return [high >> 8, high & 255, low >> 8, low & 255].join('.')
}

export function articleFingerprint(postId: number, ip: string): string | null {
  const secret = process.env.ARTICLE_VIEWS_SECRET?.trim() || process.env.PAYLOAD_SECRET
  if (!secret) return null
  // Purpose separation and article ID prevent linking fingerprints across articles.
  return createHmac('sha256', secret)
    .update(`insight:article-view:v1\n${postId}\n${ip}`)
    .digest('hex')
}

export function isKnownRobot(userAgent: string | null): boolean {
  return (
    !userAgent ||
    /bot|spider|crawler|slurp|headless|lighthouse|facebookexternalhit|preview|curl|wget|python-requests/i.test(
      userAgent,
    )
  )
}
