import { createPublicKey, verify, type JsonWebKey } from 'node:crypto'

export const WORKER_AUDIENCE = 'https://insight.trigenys.com/api/editorial/scheduled-publish'
const issuer = 'https://token.actions.githubusercontent.com'
const repository = 'EagleFox31/Trigenys-Insight'
const workflow = `${repository}/.github/workflows/publish-scheduled.yml@refs/heads/main`
type SigningKey = JsonWebKey & { kid?: string; alg?: string; use?: string }
let cachedKeys: { keys: SigningKey[]; expires: number } | undefined
async function githubKeys(): Promise<SigningKey[]> {
  if (cachedKeys && cachedKeys.expires > Date.now()) return cachedKeys.keys
  const response = await fetch(`${issuer}/.well-known/jwks`, {
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Signing keys unavailable')
  const result = await response.json()
  if (!Array.isArray(result.keys)) throw new Error('Invalid signing keys')
  cachedKeys = { keys: result.keys, expires: Date.now() + 5 * 60 * 1000 }
  return cachedKeys.keys
}

// Restrict algorithm, issuer, audience AND workflow identity. Never follow a
// caller-supplied JWKS URL, and never log the short-lived bearer credential.
export async function authorizedPublicationWorker(
  authorization: string | null,
  keys: () => Promise<SigningKey[]> = githubKeys,
): Promise<boolean> {
  try {
    const token = authorization?.match(
      /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/,
    )?.[1]
    if (!token || token.length > 20000) return false
    const [headerPart, bodyPart, signature] = token.split('.')
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString())
    const claims = JSON.parse(Buffer.from(bodyPart, 'base64url').toString())
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.crit) return false
    const now = Math.floor(Date.now() / 1000)
    if (
      claims.iss !== issuer ||
      claims.aud !== WORKER_AUDIENCE ||
      claims.repository !== repository ||
      claims.ref !== 'refs/heads/main' ||
      claims.workflow_ref !== workflow ||
      !['schedule', 'workflow_dispatch', 'push'].includes(claims.event_name)
    )
      return false
    if (
      typeof claims.exp !== 'number' ||
      typeof claims.iat !== 'number' ||
      claims.exp <= now ||
      claims.iat > now + 30 ||
      claims.iat < now - 600 ||
      claims.exp - claims.iat > 600 ||
      (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || claims.nbf > now + 30))
    )
      return false
    const key = (await keys()).find(
      (key) =>
        key.kid === header.kid &&
        key.kty === 'RSA' &&
        (!key.alg || key.alg === 'RS256') &&
        (!key.use || key.use === 'sig'),
    )
    if (!key) return false
    return verify(
      'RSA-SHA256',
      Buffer.from(`${headerPart}.${bodyPart}`),
      createPublicKey({ key, format: 'jwk' }),
      Buffer.from(signature, 'base64url'),
    )
  } catch {
    return false
  }
}
