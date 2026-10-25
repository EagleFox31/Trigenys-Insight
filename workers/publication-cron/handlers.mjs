const clockName = 'insight-publication'

async function authorized(request, body, env) {
  if (!env.PUBLICATION_SCHEDULER_SECRET) return false
  const stamp = request.headers.get('X-Scheduler-Timestamp') ?? ''
  const signature = request.headers.get('X-Scheduler-Signature') ?? ''
  if (!/^\d{10}$/.test(stamp) || !/^[a-f0-9]{64}$/.test(signature)) return false
  const now = Math.floor(Date.now() / 1000)
  if (Number(stamp) < now - 60 || Number(stamp) > now + 5) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.PUBLICATION_SCHEDULER_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const message = `${stamp}\n${request.method}\n${new URL(request.url).pathname}\n${body}`
  return crypto.subtle.verify(
    'HMAC',
    key,
    Uint8Array.from(signature.match(/../g), (byte) => parseInt(byte, 16)),
    new TextEncoder().encode(message),
  )
}

const worker = {
  async scheduled(controller, env) {
    return env.PUBLICATION_CLOCK.getByName(clockName).reconcile('hourly-recovery')
  },
  async fetch(request, env) {
    if (!request) return new Response('Not found', { status: 404 })
    const pathname = new URL(request.url).pathname
    const wake = request.method === 'POST' && pathname === '/v1/wake'
    const status = request.method === 'GET' && pathname === '/v1/status'
    if (!wake && !status) return new Response('Not found', { status: 404 })
    if (Number(request.headers.get('Content-Length') ?? 0) > 256)
      return new Response('Payload too large', { status: 413 })
    let body = ''
    if (wake && request.body) {
      const reader = request.body.getReader()
      let length = 0
      const chunks = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        length += value.byteLength
        if (length > 256) {
          await reader.cancel()
          return new Response('Payload too large', { status: 413 })
        }
        chunks.push(value)
      }
      const bytes = new Uint8Array(length)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.byteLength
      }
      body = new TextDecoder().decode(bytes)
    }
    if (!(await authorized(request, body, env)))
      return new Response('Unauthorized', { status: 401 })
    const clock = env.PUBLICATION_CLOCK.getByName(clockName)
    const headers = { 'Cache-Control': 'no-store' }
    if (status) return Response.json(await clock.status(), { headers })
    let at
    try {
      ;({ at } = JSON.parse(body))
    } catch {
      return new Response('Invalid wake time', { status: 422 })
    }
    if (!Number.isSafeInteger(at) || at < 0 || at > Date.now() + 10 * 366 * 86400000)
      return new Response('Invalid wake time', { status: 422 })
    return Response.json(await clock.wake(at), { status: 202, headers })
  },
}

export default worker
