import type { Metadata } from 'next'
import Link from 'next/link'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { CollectionArchive } from '@/components/CollectionArchive'
import type { CardPostData } from '@/components/Card'
import type { SiteLocale } from '@/i18n/config'
import { getEditorialRubric, localizedRubricPath, type EditorialRubricId } from '@/editorial/rubrics'
import { absoluteCanonicalURL, buildBreadcrumbJsonLd, serializeJsonLd } from '@/seo/structuredData'

export async function LocalizedDeskPage({
  locale,
  desk,
}: {
  locale: SiteLocale
  desk: EditorialRubricId
}) {
  const rubric = getEditorialRubric(desk)
  const copy = { title: rubric.title[locale], description: rubric.description[locale] }
  const path = localizedRubricPath(rubric, locale)
  const payload = await getPayload({ config: configPromise })

  // Query the new CMS category and original category IDs at the same time.
  // Legacy post relationships survive this navigation change without a DB migration.
  const categoryResult = await payload.find({
    collection: 'categories',
    depth: 0,
    fallbackLocale: false,
    locale,
    limit: 50,
    pagination: false,
    overrideAccess: false,
    where: { slug: { in: [rubric.id, ...rubric.legacySlugs] } },
  })

  const categoryIds = categoryResult.docs.map((category) => category.id)
  let posts: CardPostData[] = []

  if (categoryIds.length > 0) {
    const result = await payload.find({
      collection: 'posts',
      depth: 1,
      fallbackLocale: false,
      locale,
      limit: 24,
      pagination: false,
      overrideAccess: false,
      sort: '-publishedAt',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { categories: { in: categoryIds } },
        ],
      },
      select: { title: true, slug: true, categories: true, meta: true },
    })
    posts = result.docs.filter((post) => Boolean(post.title && post.slug))
  }

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: locale === 'fr' ? 'Accueil' : 'Home', path: `/${locale}` },
    { name: copy.title, path },
  ])

  return (
    <main className="py-16 md:py-24">
      <script dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} type="application/ld+json" />
      <div className="insights-shell mb-12 border-b border-[#dfded7] pb-10">
        <p className="eyebrow">{locale === 'fr' ? 'Rubrique' : 'Section'}</p>
        <h1 className="mt-4 font-[var(--font-fraunces)] text-[clamp(3rem,7vw,6.2rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#102f52]">
          {copy.title}
        </h1>
        <p className="mt-7 max-w-[66ch] text-lg leading-8 text-[#59636b]">{copy.description}</p>
      </div>

      {desk === 'made-in-africa' && (
        <div className="insights-shell mb-12 grid gap-4 sm:grid-cols-2">
          <Link href={`/${locale}/consommer-local/cameroun`} className="rounded-lg border border-[#dfded7] bg-white px-6 py-5 font-semibold text-[#102f52] hover:border-[#e07520]">
            {locale === 'fr' ? 'Consommer camerounais' : 'Buy Cameroonian'} ↗
          </Link>
          <Link href={`/${locale}/consommer-local/afrique`} className="rounded-lg border border-[#dfded7] bg-white px-6 py-5 font-semibold text-[#102f52] hover:border-[#e07520]">
            {locale === 'fr' ? 'Consommer africain' : 'Buy African'} ↗
          </Link>
        </div>
      )}

      {posts.length > 0 ? (
        <CollectionArchive locale={locale} placement="archive" posts={posts} />
      ) : (
        <div className="insights-shell">
          <p className="max-w-[62ch] text-[16px] leading-7 text-[#68727a]">
            {locale === 'fr'
              ? 'Les premiers dossiers de cette rubrique sont en préparation.'
              : 'The first stories for this section are in preparation.'}
          </p>
        </div>
      )}
    </main>
  )
}

export function localizedDeskMetadata(locale: SiteLocale, desk: EditorialRubricId): Metadata {
  const rubric = getEditorialRubric(desk)
  const path = localizedRubricPath(rubric, locale)

  return {
    title: rubric.title[locale],
    description: rubric.description[locale],
    alternates: {
      canonical: absoluteCanonicalURL(path),
      languages: {
        fr: absoluteCanonicalURL(localizedRubricPath(rubric, 'fr')),
        en: absoluteCanonicalURL(localizedRubricPath(rubric, 'en')),
        'x-default': absoluteCanonicalURL(localizedRubricPath(rubric, 'fr')),
      },
    },
  }
}
