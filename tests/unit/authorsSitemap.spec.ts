import { describe, expect, it } from 'vitest'

import { buildLocalizedAuthorSitemapEntries } from '@/seo/authorsSitemap'

const content = { root: { children: [] } }

describe('localized author profile sitemap', () => {
  it('lists each author once with the canonical URL and latest article date', () => {
    expect(
      buildLocalizedAuthorSitemapEntries('fr', [
        {
          slug: 'older',
          title: 'Older',
          excerpt: 'Summary',
          content,
          updatedAt: '2026-10-01T10:00:00.000Z',
          populatedAuthors: [{ name: 'Éloïse Ngono' }, { name: 'Team Trigenys' }],
        },
        {
          slug: 'newer',
          title: 'Newer',
          excerpt: 'Summary',
          content,
          updatedAt: '2026-10-11T10:00:00.000Z',
          populatedAuthors: [{ name: 'Eloise Ngono' }],
        },
      ]),
    ).toEqual([
      {
        loc: 'https://insight.trigenys.com/fr/authors/eloise-ngono',
        lastmod: '2026-10-11T10:00:00.000Z',
      },
      {
        loc: 'https://insight.trigenys.com/fr/authors/team-trigenys',
        lastmod: '2026-10-01T10:00:00.000Z',
      },
    ])
  })

  it('skips authors whose only articles cannot render in that locale', () => {
    expect(
      buildLocalizedAuthorSitemapEntries('en', [
        {
          slug: 'untranslated',
          title: '',
          excerpt: null,
          content: null,
          updatedAt: '2026-10-11T10:00:00.000Z',
          populatedAuthors: [{ name: 'French Only' }],
        },
        {
          slug: 'anonymous',
          title: 'Anonymous',
          excerpt: 'Summary',
          content,
          populatedAuthors: [null, { name: '  ' }],
        },
      ]),
    ).toEqual([])
  })
})
