import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  collectLocalizedPostUrls,
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY_LOCATION,
  indexNowPostFingerprint,
  isIndexNowKeyConfigured,
  normalizeIndexNowUrls,
  submitIndexNowUrls,
} from '@/seo/indexNow'

const originalKey = process.env.INDEXNOW_KEY

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.INDEXNOW_KEY
  } else {
    process.env.INDEXNOW_KEY = originalKey
  }

  vi.restoreAllMocks()
})

describe('IndexNow helpers', () => {
  it('validates configured keys without exposing them through fallback state', () => {
    delete process.env.INDEXNOW_KEY
    expect(isIndexNowKeyConfigured()).toEqual({
      configured: false,
      reason: 'not-configured',
    })

    process.env.INDEXNOW_KEY = 'bad key'
    expect(isIndexNowKeyConfigured()).toEqual({
      configured: false,
      reason: 'invalid-key',
    })

    process.env.INDEXNOW_KEY = 'Trigenys-IndexNow-2026'
    expect(isIndexNowKeyConfigured()).toEqual({
      configured: true,
      key: 'Trigenys-IndexNow-2026',
    })
  })

  it('keeps only canonical https URLs on insight.trigenys.com', () => {
    expect(
      normalizeIndexNowUrls([
        'https://insight.trigenys.com/fr/posts/test',
        'https://insight.trigenys.com/fr/posts/test',
        'https://trigenys-insight.vercel.app/fr/posts/test',
        'http://insight.trigenys.com/fr/posts/test',
        'not-a-url',
      ]),
    ).toEqual(['https://insight.trigenys.com/fr/posts/test'])
  })

  it('collects only localized article URLs whose localized content exists', async () => {
    const frOnly = await collectLocalizedPostUrls({
      slug: 'test',
      loadLocale: async (locale) =>
        locale === 'fr'
          ? { title: 'Titre', excerpt: 'Résumé', content: { root: {} } }
          : { title: '', excerpt: '', content: null },
    })

    expect(frOnly).toEqual(['https://insight.trigenys.com/fr/posts/test'])

    const bilingual = await collectLocalizedPostUrls({
      slug: 'test',
      loadLocale: async (locale) => ({
        title: locale === 'fr' ? 'Titre' : 'Title',
        excerpt: locale === 'fr' ? 'Résumé' : 'Summary',
        content: { root: {} },
      }),
    })

    expect(bilingual).toEqual([
      'https://insight.trigenys.com/fr/posts/test',
      'https://insight.trigenys.com/en/posts/test',
    ])
  })

  it('ignores timestamp-only saves when comparing the public post fingerprint', () => {
    const base = {
      slug: 'test',
      title: 'Title',
      excerpt: 'Summary',
      content: { root: { children: [] } },
      updatedAt: '2026-09-23T00:00:00.000Z',
    }
    const timestampOnly = {
      ...base,
      updatedAt: '2026-09-23T00:01:00.000Z',
    }
    const changed = {
      ...timestampOnly,
      excerpt: 'Updated summary',
    }

    expect(indexNowPostFingerprint(base)).toBe(indexNowPostFingerprint(timestampOnly))
    expect(indexNowPostFingerprint(base)).not.toBe(indexNowPostFingerprint(changed))
  })

  it('submits the canonical URL set with an explicit keyLocation', async () => {
    process.env.INDEXNOW_KEY = 'Trigenys-IndexNow-2026'
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }))
    const fetchImpl = fetchMock as unknown as typeof fetch

    const result = await submitIndexNowUrls(
      [
        'https://insight.trigenys.com/fr/posts/test',
        'https://insight.trigenys.com/en/posts/test',
      ],
      { fetchImpl, timeoutMs: 500 },
    )

    expect(result).toEqual({ status: 'submitted', count: 2, httpStatus: 202 })
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(INDEXNOW_ENDPOINT)

    const body = JSON.parse(String(init.body))
    expect(body).toEqual({
      host: 'insight.trigenys.com',
      key: 'Trigenys-IndexNow-2026',
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: [
        'https://insight.trigenys.com/fr/posts/test',
        'https://insight.trigenys.com/en/posts/test',
      ],
    })
  })

  it('skips network submission when IndexNow is not configured', async () => {
    delete process.env.INDEXNOW_KEY
    const fetchMock = vi.fn()
    const fetchImpl = fetchMock as unknown as typeof fetch

    const result = await submitIndexNowUrls(
      ['https://insight.trigenys.com/fr/posts/test'],
      { fetchImpl },
    )

    expect(result).toEqual({ status: 'skipped', reason: 'not-configured' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
