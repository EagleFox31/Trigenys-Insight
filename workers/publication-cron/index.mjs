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

const worker = {
  async scheduled(controller, env) {
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
      redirect: 'error',
      headers: { Authorization: `Bearer ${message}.${base64url(new Uint8Array(signature))}` },
      signal: AbortSignal.timeout(55000),
    })
    if (response.status === 409) {
      console.log(
        JSON.stringify({
          event: 'publication_tick_busy',
          scheduledTime: controller.scheduledTime,
          startedAt,
        }),
      )
      await response.body?.cancel()
      return
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(`Publication worker returned HTTP ${response.status}`)
    }
    const result = await response.json()
    console.log(
      JSON.stringify({
        event: 'publication_tick',
        scheduledTime: controller.scheduledTime,
        startedAt,
        processed: result.processed,
        failed: result.failed,
        remaining: result.remaining,
      }),
    )
    if (result.ok !== true || result.failed > 0)
      throw new Error('Scheduled publication jobs failed; inspect Payload jobs')
  },
  async fetch() {
    return new Response('Not found', { status: 404 })
  },
}

export default worker
