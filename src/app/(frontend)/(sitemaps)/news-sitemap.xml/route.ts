import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'

import { absoluteCanonicalURL } from '@/seo/structuredData'
import { buildNewsSitemapXml, isWithinGoogleNewsWindow, type NewsSitemapEntry, type OrdinarySitemapEntry } from '@/seo/newsSitemap'

const getNewsSitemapEntries = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const now = new Date()
    const cutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const locales = ['fr', 'en'] as const
    const entries: NewsSitemapEntry[] = []

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
          and: [
            {
              _status: {
                equals: 'published',
              },
            },
            {
              publishedAt: {
                greater_than_equal: cutoff,
              },
            },
          ],
        },
        select: {
          title: true,
          slug: true,
          publishedAt: true,
        },
      })

      for (const post of results.docs) {
        if (!post?.slug || !post?.title || !post?.publishedAt) continue
        if (!isWithinGoogleNewsWindow(post.publishedAt, now)) continue

        entries.push({
          loc: absoluteCanonicalURL(`/${locale}/posts/${post.slug}`),
          language: locale,
          publicationDate: post.publishedAt,
          title: post.title,
        })
      }
    }

    const newsEntries = entries.sort(
      (a, b) =>
        new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime(),
    )

    // Google's News rules require fresh articles for <news:news>. A gap in
    // publishing otherwise causes an entirely empty submitted sitemap.
    // Google also permits ordinary URLs without News metadata after 48h.
    // Use a small set of older, published URLs only when no fresh news exists.
    const ordinaryEntries: OrdinarySitemapEntry[] = []
    if (newsEntries.length === 0) {
      for (const locale of locales) {
        const older = await payload.find({
          collection: 'posts',
          overrideAccess: false,
          draft: false,
          depth: 0,
          fallbackLocale: false,
          locale,
          sort: '-publishedAt',
          limit: 20,
          pagination: false,
          where: {
            and: [
              { _status: { equals: 'published' } },
              { publishedAt: { less_than: cutoff } },
            ],
          },
          select: {
            title: true,
            slug: true,
            publishedAt: true,
            updatedAt: true,
          },
        })

        for (const post of older.docs) {
          if (!post?.slug || !post?.title || !post?.publishedAt) continue
          ordinaryEntries.push({
            loc: absoluteCanonicalURL(`/${locale}/posts/${post.slug}`),
            lastModified: post.updatedAt,
          })
        }
      }
    }

    return { newsEntries, ordinaryEntries }
  },
  ['news-sitemap-v2'],
  {
    tags: ['news-sitemap'],
    revalidate: 3600,
  },
)

export async function GET() {
  const { newsEntries, ordinaryEntries } = await getNewsSitemapEntries()
  const xml = buildNewsSitemapXml(newsEntries, ordinaryEntries)

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
    },
  })
}
