import { describe, expect, it } from 'vitest'

import { buildLocalizedPostSitemapEntries } from '@/seo/postsSitemap'

describe('localized public article sitemap', () => {
  const now = '2026-10-11T18:00:00.000Z'

  it('uses the canonical domain, even when deployment environment points to a preview', () => {
    expect(
      buildLocalizedPostSitemapEntries(
        'en',
        [
          {
            slug: 'example',
            title: 'Example',
            excerpt: 'Summary',
            content: { root: { children: [] } },
            updatedAt: now,
          },
        ],
        now,
      ),
    ).toEqual([
      {
        loc: 'https://insight.trigenys.com/en/posts/example',
        lastmod: now,
      },
    ])
  })

  it('never advertises untranslated or incomplete article routes that return 404', () => {
    const result = buildLocalizedPostSitemapEntries(
      'en',
      [
        { slug: 'fr-only', title: null, excerpt: null, content: null },
        { slug: 'missing-excerpt', title: 'Title', excerpt: '', content: {} },
        { slug: 'missing-content', title: 'Title', excerpt: 'Summary', content: null },
        { slug: null, title: 'Title', excerpt: 'Summary', content: {} },
        { slug: 'complete', title: 'Title', excerpt: 'Summary', content: {}, updatedAt: now },
      ],
      now,
    )

    expect(result).toEqual([
      {
        loc: 'https://insight.trigenys.com/en/posts/complete',
        lastmod: now,
      },
    ])
  })

  it('provides a stable ISO fallback when updatedAt is missing', () => {
    expect(
      buildLocalizedPostSitemapEntries(
        'fr',
        [{ slug: 'test', title: 'Titre', excerpt: 'Résumé', content: {} }],
        now,
      )[0].lastmod,
    ).toBe(now)
  })
})
