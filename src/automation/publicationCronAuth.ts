import { createPublicKey, verify, type KeyObject } from 'node:crypto'
import { WORKER_AUDIENCE } from './workerAuth'

// Public verification key only. The signing key lives exclusively in the
// Cloudflare Worker's encrypted secret binding, never in Git or the CMS.
const publicKey = createPublicKey({
  key: { crv: 'Ed25519', x: '54d5zs5JbtRvW-oJYDNNdjkKo1vfIjk19AlCRpsj1pM', kty: 'OKP' },
  format: 'jwk',
})
export const CRON_ISSUER = 'urn:trigenys:insight:cloudflare-cron'
export const CRON_SUBJECT = 'trigenys-insight-publisher'
export const CRON_KEY_ID = 'cloudflare-publication-20261015'

export function authorizedPublicationCron(
  authorization: string | null,
  verificationKey: KeyObject = publicKey,
): boolean {
  try {
    const token = authorization?.match(
      /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/,
    )?.[1]
    if (!token || token.length > 4096) return false
    const [head, body, signature] = token.split('.')
    const header = JSON.parse(Buffer.from(head, 'base64url').toString())
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (header.alg !== 'EdDSA' || header.kid !== CRON_KEY_ID || header.crit) return false
    const now = Math.floor(Date.now() / 1000)
    if (
      claims.iss !== CRON_ISSUER ||
      claims.sub !== CRON_SUBJECT ||
      claims.aud !== WORKER_AUDIENCE ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp) ||
      claims.iat > now + 5 ||
      claims.iat < now - 90 ||
      claims.exp <= now ||
      claims.exp <= claims.iat ||
      claims.exp - claims.iat > 90 ||
      (claims.nbf !== undefined && (!Number.isInteger(claims.nbf) || claims.nbf > now + 5))
    )
      return false
    return verify(
      null,
      Buffer.from(`${head}.${body}`),
      verificationKey,
      Buffer.from(signature, 'base64url'),
    )
  } catch {
    return false
  }
}
