import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

const getPostsSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const SITE_URL =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://example.com'

    const dateFallback = new Date().toISOString()
    const locales = ['fr', 'en'] as const
    const sitemap = []

    for (const locale of locales) {
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
          updatedAt: true,
        },
      })

      for (const post of results.docs) {
        if (!post?.slug || !post?.title) continue

        sitemap.push({
          loc: `${SITE_URL}/${locale}/posts/${post.slug}`,
          lastmod: post.updatedAt || dateFallback,
        })
      }
    }

    return sitemap
  },
  ['posts-sitemap-v2'],
  {
    tags: ['posts-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getPostsSitemap()

  return getServerSideSitemap(sitemap)
}
