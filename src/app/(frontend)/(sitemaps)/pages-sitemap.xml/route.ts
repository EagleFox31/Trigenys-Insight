import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import { SITE_IDENTITY } from '@/seo/structuredData'

const localizedEditorialPaths = [
  '',
  '/posts',
  '/technology',
  '/business',
  '/information-systems',
  '/africa',
  '/methodology',
  '/about',
  '/editorial-policy',
  '/contact',
] as const

const getPagesSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const SITE_URL = SITE_IDENTITY.url

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
    const locales = ['fr', 'en'] as const

    const localizedEditorialPages = locales.flatMap((locale) =>
      localizedEditorialPaths.map((path) => ({
        loc: `${SITE_URL}/${locale}${path}`,
        lastmod: dateFallback,
      })),
    )

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
  ['pages-sitemap-v3'],
  {
    tags: ['pages-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getPagesSitemap()

  return getServerSideSitemap(sitemap)
}
