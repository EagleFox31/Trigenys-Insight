import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

const getPagesSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const SITE_URL =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://example.com'

    const results = await payload.find({
      collection: 'pages',
      overrideAccess: false,
      draft: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        _status: {
          equals: 'published',
        },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const dateFallback = new Date().toISOString()

    const localizedEditorialPages = [
      {
        loc: `${SITE_URL}/fr`,
        lastmod: dateFallback,
      },
      {
        loc: `${SITE_URL}/en`,
        lastmod: dateFallback,
      },
      {
        loc: `${SITE_URL}/fr/posts`,
        lastmod: dateFallback,
      },
      {
        loc: `${SITE_URL}/en/posts`,
        lastmod: dateFallback,
      },
    ]

    // Generic CMS pages are not localized yet, so keep their canonical legacy URLs.
    const cmsPages = results.docs
      ? results.docs
          .filter((page) => Boolean(page?.slug && page.slug !== 'home'))
          .map((page) => ({
            loc: `${SITE_URL}/${page?.slug}`,
            lastmod: page.updatedAt || dateFallback,
          }))
      : []

    return [...localizedEditorialPages, ...cmsPages]
  },
  ['pages-sitemap-v2'],
  {
    tags: ['pages-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getPagesSitemap()

  return getServerSideSitemap(sitemap)
}
