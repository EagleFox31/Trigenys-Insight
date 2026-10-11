import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import { buildLocalizedPostSitemapEntries } from '@/seo/postsSitemap'

// Hooks normally invalidate this tag after an editorial change. A bounded TTL also
// recovers if a bulk import bypasses Payload hooks or an invalidation is lost.
const getPostsSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const sitemap = []

    for (const locale of ['fr', 'en'] as const) {
      const results = await payload.find({
        collection: 'posts',
        overrideAccess: false,
        draft: false,
        depth: 0,
        fallbackLocale: false,
        locale,
        limit: 1000,
        pagination: false,
        where: {
          _status: {
            equals: 'published',
          },
        },
        select: {
          title: true,
          slug: true,
          excerpt: true,
          content: true,
          updatedAt: true,
        },
      })

      // The public article route returns 404 if any of these localized fields
      // are missing. Do not advertise such URLs to search engines.
      sitemap.push(...buildLocalizedPostSitemapEntries(locale, results.docs))
    }

    return sitemap
  },
  ['posts-sitemap-v3'],
  {
    tags: ['posts-sitemap'],
    revalidate: 3600,
  },
)

export async function GET() {
  const sitemap = await getPostsSitemap()
  return getServerSideSitemap(sitemap)
}
