import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { SiteLocale } from '@/i18n/config'
import { InsightsHome } from './InsightsHome'
import { sitePositioning } from '@/seo/positioning'
import { SITE_IDENTITY } from '@/seo/structuredData'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

async function queryLocalizedHomePosts(locale: SiteLocale) {
  try {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'posts',
      depth: 2,
      fallbackLocale: false,
      limit: 20,
      locale,
      overrideAccess: false,
      sort: '-publishedAt',
      where: { _status: { equals: 'published' } },
    })

    return result.docs.filter((post) => Boolean(post.title && post.excerpt && post.content))
  } catch (error) {
    console.warn(`Trigenys Insights: CMS unavailable for locale ${locale}.`, error)
    return []
  }
}

export async function LocalizedHomePage({ locale }: { locale: SiteLocale }) {
  const posts = await queryLocalizedHomePosts(locale)

  return <InsightsHome locale={locale} posts={posts} />
}

export function localizedHomeMetadata(locale: SiteLocale): Metadata {
  const { description } = sitePositioning(locale)
  const title = 'Trigenys Insights — Research for better decisions'

  return {
    title,
    description,
    openGraph: mergeOpenGraph({
      title,
      description,
      url: `${SITE_IDENTITY.url}/${locale}`,
      locale: locale === 'fr' ? 'fr_FR' : 'en_GB',
    }),
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fr: '/fr',
        en: '/en',
        'x-default': '/fr',
      },
    },
  }
}
