import { describe, expect, it } from 'vitest'

import {
  buildNewsSitemapXml,
  GOOGLE_NEWS_MAX_AGE_MS,
  isWithinGoogleNewsWindow,
} from '@/seo/newsSitemap'

describe('Google News sitemap helpers', () => {
  it('accepts articles published within the last two days', () => {
    const now = new Date('2026-09-22T20:00:00.000Z')
    const recent = new Date(now.getTime() - GOOGLE_NEWS_MAX_AGE_MS + 60_000).toISOString()

    expect(isWithinGoogleNewsWindow(recent, now)).toBe(true)
  })

  it('rejects articles older than two days and future dates', () => {
    const now = new Date('2026-09-22T20:00:00.000Z')
    const old = new Date(now.getTime() - GOOGLE_NEWS_MAX_AGE_MS - 1).toISOString()
    const future = new Date(now.getTime() + 1).toISOString()

    expect(isWithinGoogleNewsWindow(old, now)).toBe(false)
    expect(isWithinGoogleNewsWindow(future, now)).toBe(false)
  })

  it('builds valid localized News sitemap entries and escapes XML', () => {
    const xml = buildNewsSitemapXml([
      {
        loc: 'https://insight.trigenys.com/fr/posts/test?a=1&b=2',
        language: 'fr',
        publicationDate: '2026-09-22T18:00:00.000Z',
        title: 'Tech & Business < Cameroun',
      },
      {
        loc: 'https://insight.trigenys.com/en/posts/test',
        language: 'en',
        publicationDate: '2026-09-22T18:00:00.000Z',
        title: 'Cameroon tech',
      },
    ])

    expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"')
    expect(xml).toContain('<news:name>Trigenys Insights</news:name>')
    expect(xml).toContain('<news:language>fr</news:language>')
    expect(xml).toContain('<news:language>en</news:language>')
    expect(xml).toContain(
      '<loc>https://insight.trigenys.com/fr/posts/test?a=1&amp;b=2</loc>',
    )
    expect(xml).toContain('<news:title>Tech &amp; Business &lt; Cameroun</news:title>')
  })
})
