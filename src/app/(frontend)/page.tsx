import { InsightsHome } from '@/components/insights/InsightsHome'
import configPromise from '@payload-config'
import type { Metadata } from 'next'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

async function getPublishedPosts() {
  try {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'posts',
      depth: 2,
      fallbackLocale: 'en',
      limit: 12,
      locale: 'fr',
      overrideAccess: false,
      sort: '-publishedAt',
      where: { _status: { equals: 'published' } },
    })

    return result.docs
  } catch (error) {
    console.warn('Trigenys Insights: CMS unavailable, rendering the editorial launch state.', error)
    return []
  }
}

export default async function HomePage() {
  return <InsightsHome posts={await getPublishedPosts()} />
}

export const metadata: Metadata = {
  description:
    'Recherche et analyses indépendantes sur la technologie, la cybersécurité, le business et les systèmes numériques en Afrique.',
  title: 'Trigenys Insights — Research for better decisions',
}
