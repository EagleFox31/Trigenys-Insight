const endpoint = 'https://insight.trigenys.com/api/editorial/scheduled-publish'
const issuer = 'urn:trigenys:insight:cloudflare-cron'
const subject = 'trigenys-insight-publisher'
const keyId = 'cloudflare-publication-20261015'

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}
function encode(value) {
  return base64url(new TextEncoder().encode(JSON.stringify(value)))
}

export async function runPublicationTick(env, reason) {
  const startedAt = new Date().toISOString()
  const now = Math.floor(Date.now() / 1000)
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(env.PUBLICATION_SIGNING_KEY), (c) => c.charCodeAt(0)),
    'Ed25519',
    false,
    ['sign'],
  )
  const message = `${encode({ alg: 'EdDSA', kid: keyId, typ: 'JWT' })}.${encode({ iss: issuer, sub: subject, aud: endpoint, iat: now, exp: now + 60 })}`
  const signature = await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(message))
  const response = await fetch(endpoint, {
    method: 'POST',
    redirect: 'manual',
    headers: { Authorization: `Bearer ${message}.${base64url(new Uint8Array(signature))}` },
    signal: AbortSignal.timeout(55000),
  })
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`Publication worker returned HTTP ${response.status}`)
  }
  const result = await response.json()
  console.log(
    JSON.stringify({
      event: 'publication_tick',
      reason,
      startedAt,
      processed: result.processed,
      failed: result.failed,
      bufferFailed: result.buffer?.failed ?? 0,
      remaining: result.remaining,
      nextWakeAt: result.nextWakeAt ?? null,
    }),
  )
  if (result.ok !== true || result.failed > 0 || result.buffer?.failed > 0)
    throw new Error('Scheduled publication jobs failed; inspect Payload jobs and Buffer outbox')
  return result
}
