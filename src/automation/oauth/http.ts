import { digest, OAuthError, oauthURLs } from './core'
import type { OAuthStore } from './core'

export const privateHeaders = {
  // no-referrer turns a native form POST's Origin into null. Keep same-origin
  // submissions identifiable while still withholding referrers from ChatGPT.
  'Cache-Control': 'no-store', Pragma: 'no-cache', 'Referrer-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
}
export const consentPageHeaders = {
  ...privateHeaders,
  'Content-Type': 'text/html; charset=utf-8',
  // Chromium also checks the callback redirect against form-action.
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://chatgpt.com; frame-ancestors 'none'; base-uri 'none'",
}
export function oauthFailure(error: unknown) {
  return Response.json({ error: error instanceof OAuthError ? error.code : 'server_error' }, { status: error instanceof OAuthError ? error.status : 500, headers: privateHeaders })
}
export async function readForm(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) throw new OAuthError('invalid_request')
  const body = await limitedBody(request)
  return new URLSearchParams(body)
}
export async function limitedBody(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > 16384) throw new OAuthError('invalid_request', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new OAuthError('invalid_request')
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > 16384) { await reader.cancel(); throw new OAuthError('invalid_request', 413) }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}
export async function throttle(store: OAuthStore, request: Request, endpoint: string, limit: number) {
  // The global bucket also bounds writes if forwarded headers are unavailable or spoofed.
  const ip = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'unknown'
  if (!await store.rateLimit(`${endpoint}:global`, limit * 10) || !await store.rateLimit(`${endpoint}:${digest(ip)}`, limit)) throw new OAuthError('slow_down', 429)
}
export function requireOrigin(request: Request) {
  if (request.headers.get('origin') !== oauthURLs().origin) throw new OAuthError('invalid_request', 403)
}
export function escapeHTML(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!))
}
