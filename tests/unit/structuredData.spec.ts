import { describe, expect, it } from 'vitest'

import type { Post } from '@/payload-types'
import {
  absoluteCanonicalURL,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildSiteIdentityJsonLd,
  ORGANIZATION_ID,
  SITE_IDENTITY,
} from '@/seo/structuredData'

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    title: 'Titre test',
    excerpt: 'Résumé test',
    content: {
      root: {
        type: 'root',
        children: [],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    },
    categories: [],
    authors: [],
    populatedAuthors: [],
    slug: 'titre-test',
    publishedAt: '2026-09-22T18:00:00.000Z',
    updatedAt: '2026-09-22T19:00:00.000Z',
    createdAt: '2026-09-22T17:00:00.000Z',
    _status: 'published',
    ...overrides,
  }
}

describe('structured data', () => {
  it('uses the production Trigenys Insights identity', () => {
    const data = buildSiteIdentityJsonLd()

    expect(SITE_IDENTITY.url).toBe('https://insight.trigenys.com')
    expect(data['@graph'][0]).toMatchObject({
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: 'Trigenys Insights',
      url: 'https://insight.trigenys.com',
    })
    expect(data['@graph'][1]).toMatchObject({
      '@type': 'WebSite',
      url: 'https://insight.trigenys.com',
      inLanguage: ['fr', 'en'],
    })
  })

  it('builds localized Article JSON-LD from a published post', () => {
    const post = makePost({
      heroImage: {
        id: 10,
        alt: 'Illustration',
        url: '/media/article.png',
        updatedAt: '2026-09-22T19:00:00.000Z',
        createdAt: '2026-09-22T17:00:00.000Z',
      },
      populatedAuthors: [{ id: '1', name: 'Trigenys Editorial' }],
      categories: [
        {
          id: 2,
          title: 'Technology',
          slug: 'technology',
          updatedAt: '2026-09-22T19:00:00.000Z',
          createdAt: '2026-09-22T17:00:00.000Z',
        },
      ],
    })

    const data = buildArticleJsonLd({ locale: 'fr', post, slug: post.slug })

    expect(data).toMatchObject({
      '@type': 'Article',
      headline: 'Titre test',
      description: 'Résumé test',
      url: 'https://insight.trigenys.com/fr/posts/titre-test',
      datePublished: '2026-09-22T18:00:00.000Z',
      dateModified: '2026-09-22T19:00:00.000Z',
      inLanguage: 'fr-FR',
      publisher: { '@id': ORGANIZATION_ID },
      image: ['https://insight.trigenys.com/media/article.png'],
      author: [
        {
          '@type': 'Person',
          '@id':
            'https://insight.trigenys.com/fr/authors/trigenys-editorial#person',
          name: 'Trigenys Editorial',
          url: 'https://insight.trigenys.com/fr/authors/trigenys-editorial',
        },
      ],
      articleSection: ['Technology'],
    })
  })

  it('omits optional author, image and category fields when unavailable', () => {
    const post = makePost()
    const data = buildArticleJsonLd({ locale: 'en', post, slug: post.slug })

    expect(data.inLanguage).toBe('en')
    expect(data).not.toHaveProperty('author')
    expect(data).not.toHaveProperty('image')
    expect(data).not.toHaveProperty('articleSection')
  })

  it('builds localized canonical BreadcrumbList items', () => {
    const data = buildBreadcrumbJsonLd([
      { name: 'Accueil', path: '/fr' },
      { name: 'Analyses', path: '/fr/posts' },
      { name: 'Titre test', path: '/fr/posts/titre-test' },
    ])

    expect(data).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: 'https://insight.trigenys.com/fr',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Analyses',
          item: 'https://insight.trigenys.com/fr/posts',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Titre test',
          item: 'https://insight.trigenys.com/fr/posts/titre-test',
        },
      ],
    })
  })

  it('normalizes canonical paths against the production host', () => {
    expect(absoluteCanonicalURL('fr/posts/test')).toBe(
      'https://insight.trigenys.com/fr/posts/test',
    )
  })
})
