import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  articleAuthorsArePersons,
  countH1,
  GENERIC_H1,
  hreflangs,
  hasRssAlternate,
  seoPageFailures,
  sitemapLocs,
} from '../../scripts/seo/seoChecks.mjs'
import { buildLlmsTxt } from '@/seo/llms'
import { SITE_POSITIONING, sitePositioning } from '@/seo/positioning'
import { buildRssFeed, rssFeedPath } from '@/seo/rss'
import {
  buildArticleJsonLd,
  buildCollectionPageJsonLd,
  buildSiteIdentityJsonLd,
  PARENT_ORGANIZATION,
  SITE_IDENTITY,
} from '@/seo/structuredData'
import { selectContextualLinks } from '@/seo/contextualLinks'
import { matchTrigenysProduct, TRIGENYS_PRODUCTS } from '@/seo/trigenysProducts'
import { articleDates } from '@/utilities/articleDates'
import type { Post } from '@/payload-types'

const source = (file: string) => readFile(path.join(process.cwd(), file), 'utf8')

const head = `
  <link rel="alternate" hrefLang="fr" href="https://insight.trigenys.com/fr"/>
  <link rel="alternate" hrefLang="en" href="https://insight.trigenys.com/en"/>
  <link rel="alternate" hrefLang="x-default" href="https://insight.trigenys.com/fr"/>
  <link rel="alternate" type="application/rss+xml" hrefLang="fr" title="Trigenys Insights (français)" href="https://insight.trigenys.com/fr/feed.xml"/>`

const articleLd = (author: unknown) =>
  `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [{ '@type': 'Article', headline: 'x', author }],
  })}</script>`

const person = { '@type': 'Person', '@id': 'https://insight.trigenys.com/authors/a#person', name: 'A' }

describe('SEO non-regression checks (shared with the live crawl smoke)', () => {
  it('passes a compliant home and article', () => {
    const home = `<html><head>${head}</head><body><h1>Analyses sourcées</h1><h2>À la une</h2></body></html>`
    const article = `<html><head>${head}</head><body><article><h1>Titre</h1></article>${articleLd([person])}</body></html>`

    expect(seoPageFailures(home, { kind: 'home', forbiddenH1: GENERIC_H1 })).toEqual([])
    expect(seoPageFailures(article, { kind: 'article', forbiddenH1: GENERIC_H1 })).toEqual([])
  })

  it('rejects missing, duplicated or generic H1', () => {
    expect(countH1('<h1>a</h1><script>"<h1>"</script>')).toBe(1)
    expect(seoPageFailures(`${head}<p>x</p>`, { kind: 'home' })).toContain('expected exactly one <h1>, found 0')
    expect(seoPageFailures(`${head}<h1>a</h1><h1>b</h1>`, { kind: 'home' })).toContain(
      'expected exactly one <h1>, found 2',
    )
    expect(seoPageFailures(`${head}<h1>À la une</h1>`, { kind: 'home', forbiddenH1: GENERIC_H1 })).toContain(
      '<h1> is a generic label ("À la une")',
    )
  })

  it('rejects an Article whose author is missing or not a Person', () => {
    expect(articleAuthorsArePersons(articleLd([person]))).toBe(true)
    expect(articleAuthorsArePersons(articleLd(person))).toBe(true)
    expect(articleAuthorsArePersons(articleLd(undefined))).toBe(false)
    expect(articleAuthorsArePersons(articleLd([{ '@type': 'Organization', name: 'X' }]))).toBe(false)
    expect(articleAuthorsArePersons(articleLd([{ '@type': 'Person', name: 'No id' }]))).toBe(false)
    expect(articleAuthorsArePersons('<p>no json-ld</p>')).toBe(false)
  })

  it('rejects missing hreflang and RSS declarations', () => {
    expect(hreflangs(head)).toEqual(expect.arrayContaining(['fr', 'en', 'x-default']))
    expect(hasRssAlternate(head)).toBe(true)
    const failures = seoPageFailures('<h1>x</h1>', { kind: 'home' })
    expect(failures).toEqual(
      expect.arrayContaining([
        'missing hreflang="fr"',
        'missing hreflang="en"',
        'missing hreflang="x-default"',
        'missing RSS <link rel="alternate">',
      ]),
    )
  })

  it('reads sitemap locations', () => {
    expect(
      sitemapLocs('<urlset><url><loc> https://insight.trigenys.com/fr/posts/a?x=1&amp;y=2 </loc></url></urlset>'),
    ).toEqual(['https://insight.trigenys.com/fr/posts/a?x=1&y=2'])
  })

  it('is wired into the live crawl smoke', async () => {
    const script = await source('scripts/seo/public-crawl-smoke.mjs')
    expect(script).toContain("from './seoChecks.mjs'")
    expect(script).toContain("assertSeoContract(homeHTML")
    expect(script).toContain("assertSeoContract(articleHTML")
  })
})

describe('P0 — home H1 and single positioning', () => {
  it('renders the positioning headline as the only home H1 and demotes the carousel title', async () => {
    const home = await source('src/components/insights/InsightsHome.tsx')
    expect(home).toContain('{sitePositioning(locale).headline}</h1>')
    expect(home).toMatch(/<HeroCarousel[\s\S]*?headingLevel=\{2\}/)
  })

  it('uses one positioning text for meta, Open Graph, llms.txt and Organization', async () => {
    for (const locale of ['fr', 'en'] as const) {
      expect(sitePositioning(locale)).toBe(SITE_POSITIONING[locale])
      expect(SITE_POSITIONING[locale].description.length).toBeLessThanOrEqual(200)
    }
    const homePage = await source('src/components/insights/LocalizedHomePage.tsx')
    expect(homePage).toContain('sitePositioning(locale)')
    expect(homePage).toContain('openGraph: mergeOpenGraph(')

    const llms = buildLlmsTxt({ fr: [], en: [] })
    expect(llms).toContain(SITE_POSITIONING.en.description)
    expect(llms).toContain(SITE_POSITIONING.fr.description)

    expect(SITE_IDENTITY.description).toBe(SITE_POSITIONING.en.description)
  })

  it('links the newsroom to the Trigenys organization declared on www.trigenys.com', () => {
    const graph = buildSiteIdentityJsonLd()['@graph'] as Record<string, unknown>[]
    expect(JSON.stringify(graph)).toContain(PARENT_ORGANIZATION.id)
  })
})

describe('P0 — Article authorship and dates', () => {
  const post = {
    id: 1,
    title: 'Titre',
    slug: 'titre',
    publishedAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-05T08:00:00.000Z',
    createdAt: '2026-10-01T07:00:00.000Z',
    populatedAuthors: [{ id: '7', name: 'Jane Doe' }],
  } as unknown as Post

  it('declares authors as Person with profile fields and the parent publisher', () => {
    const data = buildArticleJsonLd({
      locale: 'fr',
      post,
      slug: 'titre',
      authorProfiles: {
        'jane-doe': { jobTitle: 'Analyste', bio: 'Paiements.', profileLinks: [{ url: 'https://x.com/jane' }] },
      },
    }) as unknown as { publisher: { '@id': string }; author: unknown[]; datePublished: string; dateModified: string }

    expect(data.publisher['@id']).toBe(PARENT_ORGANIZATION.id)
    expect(data.author[0]).toMatchObject({
      '@type': 'Person',
      '@id': 'https://insight.trigenys.com/authors/jane-doe#person',
      url: 'https://insight.trigenys.com/fr/authors/jane-doe',
      jobTitle: 'Analyste',
      description: 'Paiements.',
      sameAs: ['https://x.com/jane'],
    })
    expect(data.datePublished).toBe(post.publishedAt)
    expect(data.dateModified).toBe(post.updatedAt)
  })

  it('surfaces a modification only after 24 hours', () => {
    expect(articleDates({ publishedAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-01T20:00:00Z' })).toMatchObject({
      modified: '2026-10-01T08:00:00Z',
      showModified: false,
    })
    expect(articleDates({ publishedAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-03T08:00:00Z' }).showModified).toBe(true)
    expect(articleDates({ createdAt: '2026-10-01T08:00:00Z' }).published).toBe('2026-10-01T08:00:00Z')
  })

  it('shows the publication date as a <time> element in the article header', async () => {
    const hero = await source('src/heros/PostHero/index.tsx')
    expect(hero).toContain('articleDates(post)')
    expect(hero).toMatch(/<time dateTime=\{published\}/)
  })
})

describe('P1 — internal linking, products, RSS and desk pages', () => {
  const doc = (id: number, categories: number[] = [], slug: string | null = `p${id}`) => ({ id, slug, categories })

  it('selects three contextual links: picks, same desk, then recent', () => {
    const current = doc(1, [10])
    const links = selectContextualLinks(current, [doc(2)], [doc(1, [10]), doc(3), doc(4, [10]), doc(5, [10]), doc(6, [], null)])
    expect(links.map((link) => link.id)).toEqual([2, 4, 5])
    expect(selectContextualLinks(current, [], [doc(3), doc(4, [10])]).map((link) => link.id)).toEqual([4, 3])
  })

  it('matches a Trigenys product only on a relevant topic', () => {
    expect(matchTrigenysProduct({ title: 'Le boom du e-commerce à Douala' })?.id).toBe('commerce-factory')
    expect(matchTrigenysProduct({ title: 'Inflation en zone CEMAC' })).toBeNull()
    for (const product of TRIGENYS_PRODUCTS) expect(product.url).toMatch(/^https:\/\//)
  })

  it('builds a valid, escaped RSS feed and declares it in the head', async () => {
    const xml = buildRssFeed('fr', [
      { title: 'A & B', slug: 'a-b', excerpt: '<x>', publishedAt: '2026-10-01T08:00:00.000Z' },
      { title: 'Brouillon', slug: 'draft', publishedAt: null },
    ])
    expect(xml).toContain('<title>A &amp; B</title>')
    expect(xml).toContain('<description>&lt;x&gt;</description>')
    expect(xml).toContain('https://insight.trigenys.com/fr/posts/a-b')
    expect(xml).not.toContain('draft')
    expect(xml).toContain(`href="https://insight.trigenys.com${rssFeedPath('fr')}"`)

    const layout = await source('src/app/(frontend)/layout.tsx')
    expect(layout).toContain('type="application/rss+xml"')
  })

  it('describes desk pages as CollectionPage with an ItemList', () => {
    const data = buildCollectionPageJsonLd({
      locale: 'en',
      path: '/en/desks/ai',
      name: 'AI',
      description: 'AI desk',
      posts: [{ title: 'One', slug: 'one' }, { title: null, slug: 'skip' }],
    }) as unknown as { '@type': string; mainEntity: { numberOfItems: number } }
    expect(data['@type']).toBe('CollectionPage')
    expect(data.mainEntity.numberOfItems).toBe(1)
  })
})
