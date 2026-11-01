// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { articleFingerprint, clientIP } from '@/lib/articleViews/identity'
import { articleViewsEndpoint } from '@/endpoints/articleViews'
import { getArticleViews } from '@/automation/articleViews'
import { operationSchema } from '../../packages/insight-automation/src/schema'
import { operationScopes } from '@/automation/oauth/core'

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production')
  vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://insight.example')
  vi.stubEnv('PAYLOAD_SECRET', 'unit-test-hmac-key-not-a-real-secret')
  vi.stubEnv('ARTICLE_VIEWS_ENABLED', 'true')
  vi.stubEnv('NEXT_PUBLIC_EDITORIAL_ANALYTICS_ENABLED', 'true')
})
afterEach(() => vi.unstubAllEnvs())

function setup(
  headers: Record<string, string | undefined> = {},
  body: unknown = { postId: 44, locale: 'fr' },
) {
  const payload = {
    find: vi.fn(async () => ({
      docs: [{ id: 44, slug: 'splashark', title: 'SplashArk', _status: 'published' }],
    })),
    db: { pool: { query: vi.fn(async () => ({ rows: [{ counted: true }] })) } },
    logger: { warn: vi.fn() },
  }
  const req = Object.assign(
    new Request('https://insight.example/api/article-views', {
      method: 'POST',
      headers: {
        origin: 'https://insight.example',
        referer: 'https://insight.example/fr/posts/splashark',
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 Chrome/130 Safari/537.36',
        'sec-fetch-site': 'same-origin',
        'x-vercel-forwarded-for': '192.0.2.8',
        ...Object.fromEntries(Object.entries(headers).filter(([, value]) => value !== undefined)),
      },
      body: JSON.stringify(body),
    }),
    { payload },
  ) as unknown as PayloadRequest
  return { req, payload, collect: () => articleViewsEndpoint.handler(req) }
}

describe('trusted IP and privacy', () => {
  it('normalizes IPv6 and mapped IPv4 and scopes keyed hashes to an article', () => {
    const ip = (value: string) => clientIP(new Headers({ 'x-vercel-forwarded-for': value }))
    expect(ip('2001:0DB8:0000:0000:0000:0000:0000:0001')).toBe('2001:db8::1')
    expect(ip('::ffff:192.0.2.8')).toBe('192.0.2.8')
    expect(ip('::ffff:c000:208')).toBe('192.0.2.8')
    const fingerprint = articleFingerprint(44, '192.0.2.8')
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(fingerprint).not.toContain('192.0.2.8')
    expect(fingerprint).not.toBe(articleFingerprint(54, '192.0.2.8'))
    vi.stubEnv('PAYLOAD_SECRET', 'another-unit-key')
    expect(fingerprint).not.toBe(articleFingerprint(44, '192.0.2.8'))
  })
  it('does not trust arbitrary proxy headers or preview deployments', () => {
    expect(clientIP(new Headers({ 'x-forwarded-for': '192.0.2.8' }))).toBeNull()
    expect(
      clientIP(new Headers({ 'x-vercel-forwarded-for': '192.0.2.8, 198.51.100.9' })),
    ).toBeNull()
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect(clientIP(new Headers({ 'x-vercel-forwarded-for': '192.0.2.8' }))).toBeNull()
  })
})

describe('public view collector', () => {
  it('counts the public snapshot with parameters and persists no raw IP or user agent', async () => {
    const s = setup()
    const response = await s.collect()
    expect(response.status).toBe(204)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(s.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: false,
        overrideAccess: false,
        fallbackLocale: false,
        locale: 'fr',
      }),
    )
    const parameters = s.payload.db.pool.query.mock.calls[0] as unknown as [string, unknown[]]
    expect(parameters[1]).toEqual([44, articleFingerprint(44, '192.0.2.8'), 'fr'])
    expect(JSON.stringify(s.payload.db.pool.query.mock.calls)).not.toContain('192.0.2.8')
    expect(JSON.stringify(s.payload.db.pool.query.mock.calls)).not.toContain('Mozilla')
  })
  it.each([
    { origin: 'https://other.example' },
    { referer: 'https://other.example/fr/posts/splashark' },
    { 'sec-fetch-site': 'cross-site' },
    { 'content-type': 'text/plain' },
  ])('rejects cross-site and non-JSON requests before database work: %j', async (headers) => {
    const s = setup(headers)
    expect((await s.collect()).status).toBe(403)
    expect(s.payload.find).not.toHaveBeenCalled()
    expect(s.payload.db.pool.query).not.toHaveBeenCalled()
  })
  it.each([
    { 'user-agent': 'Googlebot/2.1' },
    { dnt: '1' },
    { 'sec-gpc': '1' },
    { cookie: '__prerender_bypass=preview' },
    { 'x-vercel-forwarded-for': 'bad' },
  ])('ignores bots, opt-outs, previews and missing trusted IPs: %j', async (headers) => {
    const s = setup(headers)
    expect((await s.collect()).status).toBe(204)
    expect(s.payload.find).not.toHaveBeenCalled()
    expect(s.payload.db.pool.query).not.toHaveBeenCalled()
  })
  it('ignores authenticated editors and disabled/preview environments', async () => {
    const editor = setup()
    editor.req.user = { id: 1 } as PayloadRequest['user']
    await editor.collect()
    expect(editor.payload.find).not.toHaveBeenCalled()
    for (const [key, value] of [
      ['VERCEL_ENV', 'preview'],
      ['ARTICLE_VIEWS_ENABLED', 'false'],
      ['NEXT_PUBLIC_EDITORIAL_ANALYTICS_ENABLED', 'false'],
    ]) {
      const s = setup()
      vi.stubEnv(key, value)
      await s.collect()
      expect(s.payload.find).not.toHaveBeenCalled()
      vi.stubEnv(key, key === 'VERCEL_ENV' ? 'production' : 'true')
    }
  })
  it.each([
    { postId: 44, locale: 'fr', ip: '198.51.100.9' },
    { postId: 44, locale: 'xx' },
    { postId: -1, locale: 'fr' },
  ])('rejects client IP injection and malformed selectors', async (body) => {
    const s = setup({}, body)
    expect((await s.collect()).status).toBe(400)
    expect(s.payload.find).not.toHaveBeenCalled()
  })
  it('bounds a chunked request without a content-length header', async () => {
    const s = setup({}, { postId: 44, locale: 'fr', padding: 'x'.repeat(300) })
    expect((await s.collect()).status).toBe(400)
    expect(s.payload.find).not.toHaveBeenCalled()
  })
  it('ignores drafts, absent translations and unrelated referring pages', async () => {
    const draft = setup()
    draft.payload.find.mockResolvedValue({
      docs: [{ id: 44, slug: 'splashark', title: 'Draft', _status: 'draft' }],
    })
    await draft.collect()
    expect(draft.payload.db.pool.query).not.toHaveBeenCalled()
    const missing = setup()
    missing.payload.find.mockResolvedValue({ docs: [] })
    await missing.collect()
    expect(missing.payload.db.pool.query).not.toHaveBeenCalled()
    const home = setup({ referer: 'https://insight.example/fr' })
    await home.collect()
    expect(home.payload.db.pool.query).not.toHaveBeenCalled()
  })
  it('uses the same guard across languages and never exposes database errors', async () => {
    const s = setup(
      { referer: 'https://insight.example/en/posts/splashark' },
      { postId: 44, locale: 'en' },
    )
    await s.collect()
    expect((s.payload.db.pool.query.mock.calls[0] as unknown as [string, unknown[]])[1]).toEqual([
      44,
      articleFingerprint(44, '192.0.2.8'),
      'en',
    ])
    const failed = setup()
    failed.payload.db.pool.query.mockRejectedValue(new Error('private database error'))
    expect((await failed.collect()).status).toBe(204)
    expect(failed.payload.logger.warn).toHaveBeenCalledWith('Article view collector unavailable')
  })
})

describe('statistics API', () => {
  it('keeps both tools read-only and validates periods', () => {
    for (const input of [
      { operation: 'article-views', postId: 44 },
      { operation: 'top-articles' },
    ]) {
      expect(operationScopes(operationSchema.parse(input))).toEqual(['editorial:read'])
    }
    expect(operationSchema.safeParse({ operation: 'top-articles', days: 366 }).success).toBe(false)
    expect(operationSchema.safeParse({ operation: 'top-articles', limit: 1000 }).success).toBe(
      false,
    )
  })
  it('returns a real collection start, zero for an unvisited article, and no fingerprint', async () => {
    const s = setup()
    s.payload.db.pool.query
      .mockResolvedValueOnce({
        rows: [
          { started_at: '2026-11-01T16:00:00Z', today: '2026-11-01', first_day: '2026-10-26' },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [] })
    const result = await getArticleViews(s.req, { postId: 44, days: 7 })
    expect(result).toMatchObject({
      trackingSince: '2026-11-01T16:00:00.000Z',
      fromDate: '2026-10-26',
      timezone: 'Africa/Douala',
      docs: [{ postId: 44, views: 0, byLocale: { fr: 0, en: 0 } }],
    })
    expect(JSON.stringify(result)).not.toMatch(/fingerprint|192\.0\.2/)
  })
  it('preserves database rank and returns the language breakdown', async () => {
    const s = setup()
    s.payload.db.pool.query
      .mockResolvedValueOnce({
        rows: [
          { started_at: '2026-11-01T16:00:00Z', today: '2026-11-01', first_day: '2026-10-03' },
        ],
      } as never)
      .mockResolvedValueOnce({
        rows: [
          { post_id: 54, views: '9', fr: '7', en: '2' },
          { post_id: 44, views: '3', fr: '3', en: '0' },
        ],
      } as never)
    const result = await getArticleViews(s.req, { days: 30 })
    expect(result.docs.map((row) => row.postId)).toEqual([54, 44])
    expect(result.docs[0]).toMatchObject({ views: 9, byLocale: { fr: 7, en: 2 } })
  })
})
