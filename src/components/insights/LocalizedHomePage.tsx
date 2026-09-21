import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { SiteLocale } from '@/i18n/config'
import { InsightsHome } from './InsightsHome'

export async function LocalizedHomePage({ locale }: { locale: SiteLocale }) {
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

    const posts = result.docs.filter((post) => Boolean(post.title && post.excerpt && post.content))

    return <InsightsHome locale={locale} posts={posts} />
  } catch (error) {
    console.warn(`Trigenys Insights: CMS unavailable for locale ${locale}.`, error)
    return <InsightsHome locale={locale} posts={[]} />
  }
}

export function localizedHomeMetadata(locale: SiteLocale): Metadata {
  const french = locale === 'fr'

  return {
    title: 'Trigenys Insights — Research for better decisions',
    description: french
      ? 'Recherche et analyses indépendantes sur la technologie, la cybersécurité, le business et les systèmes numériques en Afrique.'
      : 'Independent research and analysis on technology, cybersecurity, business and digital systems in Africa.',
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
