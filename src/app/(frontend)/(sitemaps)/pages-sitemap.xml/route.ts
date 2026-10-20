import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'

import { SITE_IDENTITY } from '@/seo/structuredData'
import { editorialRubrics, localizedRubricPath } from '@/editorial/rubrics'
import { buildLocalizedAuthorSitemapEntries } from '@/seo/authorsSitemap'

const localizedEditorialPaths = [
  '',
  '/posts',
  '/consommer-local/cameroun',
  '/consommer-local/afrique',
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

    // Author profiles exist only through the posts they sign, per locale.
    const authorPages = []
    for (const locale of locales) {
      const posts = await payload.find({
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
          authors: true,
          populatedAuthors: true,
        },
      })

      authorPages.push(...buildLocalizedAuthorSitemapEntries(locale, posts.docs, dateFallback))
    }

    const localizedEditorialPages = locales.flatMap((locale) => [
      ...localizedEditorialPaths.map((path) => ({
        loc: `${SITE_URL}/${locale}${path}`,
        lastmod: dateFallback,
      })),
      ...editorialRubrics.map((rubric) => ({
        loc: `${SITE_URL}${localizedRubricPath(rubric, locale)}`,
        lastmod: dateFallback,
      })),
    ])

    // Generic CMS pages are not localized yet, so keep their canonical legacy URLs.
    const cmsPages = results.docs
      ? results.docs
          .filter((page) => Boolean(page?.slug && page.slug !== 'home'))
          .map((page) => ({
            loc: `${SITE_URL}/${page?.slug}`,
            lastmod: page.updatedAt || dateFallback,
          }))
      : []

    return [...localizedEditorialPages, ...authorPages, ...cmsPages]
  },
  ['pages-sitemap-v5'],
  {
    tags: ['pages-sitemap'],
    revalidate: 86400,
  },
)

export async function GET() {
  const sitemap = await getPagesSitemap()

  return getServerSideSitemap(sitemap)
}
