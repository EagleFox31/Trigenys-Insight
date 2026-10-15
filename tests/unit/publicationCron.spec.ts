// @vitest-environment node
import { generateKeyPairSync, sign } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  authorizedPublicationCron,
  CRON_ISSUER,
  CRON_KEY_ID,
  CRON_SUBJECT,
} from '@/automation/publicationCronAuth'
import { WORKER_AUDIENCE } from '@/automation/workerAuth'
import worker from '../../workers/publication-cron/index.mjs'

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const now = () => Math.floor(Date.now() / 1000)
function token(claims: Record<string, unknown> = {}, header: Record<string, unknown> = {}) {
  const h = Buffer.from(JSON.stringify({ alg: 'EdDSA', kid: CRON_KEY_ID, ...header })).toString(
    'base64url',
  )
  const b = Buffer.from(
    JSON.stringify({
      iss: CRON_ISSUER,
      sub: CRON_SUBJECT,
      aud: WORKER_AUDIENCE,
      iat: now(),
      exp: now() + 60,
      ...claims,
    }),
  ).toString('base64url')
  return `Bearer ${h}.${b}.${sign(null, Buffer.from(`${h}.${b}`), privateKey).toString('base64url')}`
}
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
describe('dedicated publication cron authentication', () => {
  it('accepts a correctly signed short-lived identity and rejects unrelated keys', () => {
    expect(authorizedPublicationCron(token(), publicKey)).toBe(true)
    expect(authorizedPublicationCron(token())).toBe(false)
    expect(authorizedPublicationCron(token(), generateKeyPairSync('ed25519').publicKey)).toBe(false)
  })
  it('rejects invalid identities, stale/future/oversized lifetimes, algorithms and altered signatures', () => {
    for (const claims of [
      { iss: 'other' },
      { sub: 'other' },
      { aud: 'other' },
      { exp: now() - 1 },
      { iat: now() + 20 },
      { iat: now() - 120 },
      { exp: now() + 120 },
      { exp: now() },
      { iat: 'now' },
      { nbf: now() + 20 },
    ])
      expect(authorizedPublicationCron(token(claims), publicKey)).toBe(false)
    for (const header of [{ alg: 'none' }, { alg: 'HS256' }, { kid: 'other' }, { crit: ['x'] }])
      expect(authorizedPublicationCron(token({}, header), publicKey)).toBe(false)
    const altered = token().split('.')
    altered[2] = Buffer.alloc(64).toString('base64url')
    expect(authorizedPublicationCron(altered.join('.'), publicKey)).toBe(false)
    for (const input of [null, '', 'Bearer broken', `Bearer ${'a'.repeat(5000)}.a.a`])
      expect(authorizedPublicationCron(input, publicKey)).toBe(false)
  })
})
describe('automatic scheduled handler', () => {
  const env = {
    PUBLICATION_SIGNING_KEY: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
  }
  it('calls only the fixed CMS worker with a valid signed identity and awaits its actual result', async () => {
    const fetch = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe(WORKER_AUDIENCE)
      expect(init.method).toBe('POST')
      expect(init.redirect).toBe('error')
      expect(
        authorizedPublicationCron(
          (init.headers as Record<string, string>).Authorization,
          publicKey,
        ),
      ).toBe(true)
      return Response.json({ ok: true, processed: 1, failed: 0, remaining: 0 })
    })
    vi.stubGlobal('fetch', fetch)
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await worker.scheduled({ scheduledTime: Date.now() }, env)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"processed":1'))
    expect(log.mock.calls.flat().join()).not.toContain('Bearer')
  })
  it('surfaces HTTP and publication failures instead of reporting success; a busy worker retries on the next tick', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    )
    await expect(worker.scheduled({ scheduledTime: Date.now() }, env)).rejects.toThrow('HTTP 401')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ok: true, processed: 1, failed: 1 })),
    )
    await expect(worker.scheduled({ scheduledTime: Date.now() }, env)).rejects.toThrow(
      'jobs failed',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 409 })),
    )
    await expect(worker.scheduled({ scheduledTime: Date.now() }, env)).resolves.toBeUndefined()
  })
  it('does not expose an HTTP endpoint to run or sign publications', async () => {
    expect((await worker.fetch()).status).toBe(404)
  })
})
