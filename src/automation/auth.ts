import type { PayloadRequest } from 'payload'
import { createHash, timingSafeEqual } from 'node:crypto'

// Preserve the existing Editorial OS integration until its token is rotated.
const LEGACY_TOKEN_SHA256 = '823fc4481572586f035973801b493d85ba24f9df1489fe929fc088aff8953005'

export function authorizedEditorialRequest(authorization: string | null): boolean {
  if (!authorization?.startsWith('Bearer ')) return false
  const expected = process.env.INSIGHT_PUBLISHING_TOKEN_SHA256?.trim() || LEGACY_TOKEN_SHA256
  if (!/^[a-f0-9]{64}$/i.test(expected)) return false
  const actual = createHash('sha256').update(authorization.slice(7).trim()).digest()
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'))
}

export function authorizedEditorialSession(req: Pick<PayloadRequest, 'headers' | 'user'>): boolean {
  if (!req.user) return false
  const origin = req.headers.get('origin')
  if (!origin) return false
  const configuredURL = process.env.NEXT_PUBLIC_SERVER_URL
  if (!configuredURL) return false
  try {
    return new URL(origin).origin === new URL(configuredURL).origin
  } catch {
    return false
  }
}
