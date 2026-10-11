import type { Media, Post, ResearchSource } from '@/payload-types'
import type { SiteLocale } from '@/i18n/config'
import { authorSlug } from '@/utilities/authorSlug'
import { getFaqItems, getKeyTakeaways } from '@/seo/answerContent'
import { socialProfiles } from '@/Footer/socialProfiles'

export const SITE_IDENTITY = {
  name: 'Trigenys Insights',
  url: 'https://insight.trigenys.com',
  logoPath: '/trigenys-insights-logo-512.png',
  description:
    'Independent, bilingual publication of source-backed analysis on technology, business, information systems and Africa, published from Douala, Cameroon.',
  topics: ['Technology', 'Business', 'Information systems', 'Cybersecurity', 'Africa'],
} as const

// Official public profiles (the verified ones shown in the footer). Answer
// engines use sameAs to reconcile the entity across the web, so share/redirect
// links are left out: only stable profile URLs belong here.
export const SITE_SAME_AS: readonly string[] = socialProfiles
  .map((profile) => profile.url)
  .filter((url) => !new URL(url).pathname.startsWith('/share/'))

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
        '@type': 'NewsMediaOrganization',
        '@id': ORGANIZATION_ID,
        name: SITE_IDENTITY.name,
        url: SITE_IDENTITY.url,
        description: SITE_IDENTITY.description,
        foundingLocation: {
          '@type': 'Place',
          name: 'Douala, Cameroon',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Douala',
            addressCountry: 'CM',
          },
        },
        areaServed: { '@type': 'Place', name: 'Africa' },
        knowsAbout: [...SITE_IDENTITY.topics],
        ...(SITE_SAME_AS.length > 0 ? { sameAs: [...SITE_SAME_AS] } : {}),
        logo: {
          '@type': 'ImageObject',
          url: absoluteCanonicalURL(SITE_IDENTITY.logoPath),
          width: 512,
          height: 512,
        },
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: SITE_IDENTITY.url,
        name: SITE_IDENTITY.name,
        description: SITE_IDENTITY.description,
        publisher: {
          '@id': ORGANIZATION_ID,
        },
        inLanguage: ['fr', 'en'],
      },
    ],
  }
}

export type BreadcrumbItem = {
  name: string
  path: string
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteCanonicalURL(item.path),
    })),
  }
}

function isPublicSource(source: unknown): source is ResearchSource {
  return (
    typeof source === 'object' &&
    source !== null &&
    typeof (source as ResearchSource).url === 'string' &&
    /^https?:\/\//i.test((source as ResearchSource).url) &&
    Boolean((source as ResearchSource).title?.trim())
  )
}

/**
 * Public citations for an article. Only bibliographic fields are exposed;
 * internal registry notes stay out of the markup.
 */
export function buildArticleCitations(sources: Post['sources']) {
  return (sources || []).filter(isPublicSource).map((source) => {
    const citation: Record<string, unknown> = {
      '@type': 'CreativeWork',
      name: source.title.trim(),
      url: source.url,
    }

    if (source.publisher?.trim()) {
      citation.publisher = { '@type': 'Organization', name: source.publisher.trim() }
    }
    if (source.publishedAt) citation.datePublished = source.publishedAt

    return citation
  })
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
      .map((name) => {
        const profileURL = absoluteCanonicalURL(`/${locale}/authors/${authorSlug(name)}`)

        return {
          '@type': 'Person',
          '@id': `${profileURL}#person`,
          name,
          url: profileURL,
        }
      }) || []

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

  const citations = buildArticleCitations(post.sources)
  const takeaways = getKeyTakeaways(post)

  if (image) jsonLd.image = [image]
  if (citations.length > 0) jsonLd.citation = citations
  if (takeaways.length > 0) jsonLd.abstract = takeaways.join(' ')
  if (authors.length > 0) jsonLd.author = authors
  if (categories && categories.length > 0) {
    jsonLd.articleSection = categories
    jsonLd.keywords = categories.join(', ')
  }

  return jsonLd
}

/**
 * FAQPage for the questions rendered at the end of the article. Only emitted
 * when the page visibly shows the same questions and answers.
 */
export function buildFaqJsonLd({
  locale,
  post,
  slug,
}: {
  locale: SiteLocale
  post: Pick<Post, 'faq'>
  slug: string
}) {
  const items = getFaqItems(post)
  if (items.length === 0) return null

  const canonicalURL = absoluteCanonicalURL(`/${locale}/posts/${slug}`)

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${canonicalURL}#faq`,
    url: canonicalURL,
    inLanguage: locale === 'fr' ? 'fr-FR' : 'en',
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export type PublicAuthorProfile = {
  name: string
  jobTitle?: string | null
  bio?: string | null
  expertise?: string[] | null
  profileLinks?: { url?: string | null }[] | null
}

/** ProfilePage + Person for a public author page; only public profile fields. */
export function buildAuthorProfileJsonLd({
  locale,
  slug,
  profile,
}: {
  locale: SiteLocale
  slug: string
  profile: PublicAuthorProfile
}) {
  const canonicalURL = absoluteCanonicalURL(`/${locale}/authors/${slug}`)
  const sameAs = (profile.profileLinks || [])
    .map((link) => link?.url?.trim())
    .filter((url): url is string => Boolean(url && /^https:\/\//i.test(url)))
  const expertise = (profile.expertise || []).map((topic) => topic.trim()).filter(Boolean)

  const person: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${canonicalURL}#person`,
    name: profile.name,
    url: canonicalURL,
    worksFor: { '@id': ORGANIZATION_ID },
  }

  if (profile.jobTitle?.trim()) person.jobTitle = profile.jobTitle.trim()
  if (profile.bio?.trim()) person.description = profile.bio.trim()
  if (expertise.length > 0) person.knowsAbout = expertise
  if (sameAs.length > 0) person.sameAs = sameAs

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${canonicalURL}#profile`,
    url: canonicalURL,
    inLanguage: locale === 'fr' ? 'fr-FR' : 'en',
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: person,
  }
}

export function buildJsonLdGraph(
  ...documents: Array<Record<string, unknown> | null | undefined>
) {
  const graph = documents
    .filter((document): document is Record<string, unknown> => Boolean(document))
    .map((document) => {
      const { ['@context']: _context, ...node } = document
      return node
    })

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
