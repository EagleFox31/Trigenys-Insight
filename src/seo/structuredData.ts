import type { Media, Post } from '@/payload-types'
import type { SiteLocale } from '@/i18n/config'

export const SITE_IDENTITY = {
  name: 'Trigenys Insights',
  url: 'https://insight.trigenys.com',
  logoPath: '/favicon.svg',
} as const

export const ORGANIZATION_ID = `${SITE_IDENTITY.url}/#organization`
export const WEBSITE_ID = `${SITE_IDENTITY.url}/#website`

export function absoluteCanonicalURL(path = '/') {
  if (/^https?:\/\//i.test(path)) return path

  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_IDENTITY.url}${normalized}`
}

export function mediaURL(media?: number | Media | null, preferredSize: 'original' | 'og' = 'original') {
  if (!media || typeof media !== 'object') return undefined

  const path = preferredSize === 'og' ? media.sizes?.og?.url || media.url : media.url
  if (!path) return undefined

  return absoluteCanonicalURL(path)
}

export function buildSiteIdentityJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: SITE_IDENTITY.name,
        url: SITE_IDENTITY.url,
        logo: {
          '@type': 'ImageObject',
          url: absoluteCanonicalURL(SITE_IDENTITY.logoPath),
        },
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: SITE_IDENTITY.url,
        name: SITE_IDENTITY.name,
        publisher: {
          '@id': ORGANIZATION_ID,
        },
        inLanguage: ['fr', 'en'],
      },
    ],
  }
}

export function buildArticleJsonLd({
  locale,
  post,
  slug,
}: {
  locale: SiteLocale
  post: Post
  slug: string
}) {
  const canonicalURL = absoluteCanonicalURL(`/${locale}/posts/${slug}`)
  const heroImage = mediaURL(post.heroImage)
  const fallbackImage = mediaURL(post.meta?.image, 'og')
  const image = heroImage || fallbackImage

  const authors =
    post.populatedAuthors
      ?.map((author) => author?.name?.trim())
      .filter((name): name is string => Boolean(name))
      .map((name) => ({
        '@type': 'Person',
        name,
      })) || []

  const categories = post.categories
    ?.map((category) => (typeof category === 'object' && category ? category.title : null))
    .filter((title): title is string => Boolean(title))

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${canonicalURL}#article`,
    headline: post.title,
    description: post.excerpt,
    url: canonicalURL,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalURL,
    },
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt,
    inLanguage: locale === 'fr' ? 'fr-FR' : 'en',
    publisher: {
      '@id': ORGANIZATION_ID,
    },
    isPartOf: {
      '@id': WEBSITE_ID,
    },
  }

  if (image) jsonLd.image = [image]
  if (authors.length > 0) jsonLd.author = authors
  if (categories && categories.length > 0) {
    jsonLd.articleSection = categories
    jsonLd.keywords = categories.join(', ')
  }

  return jsonLd
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
