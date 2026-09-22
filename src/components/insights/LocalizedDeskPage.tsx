import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { CollectionArchive } from '@/components/CollectionArchive'
import type { CardPostData } from '@/components/Card'
import type { SiteLocale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import { absoluteCanonicalURL, buildBreadcrumbJsonLd, serializeJsonLd } from '@/seo/structuredData'

export type DeskSlug = 'technology' | 'business' | 'information-systems' | 'africa'

const deskKey: Record<DeskSlug, 'technology' | 'business' | 'systems' | 'africa'> = {
  technology: 'technology',
  business: 'business',
  'information-systems': 'systems',
  africa: 'africa',
}

export async function LocalizedDeskPage({
  locale,
  desk,
}: {
  locale: SiteLocale
  desk: DeskSlug
}) {
  const payload = await getPayload({ config: configPromise })
  const t = getMessages(locale)
  const copy = t.pillars[deskKey[desk]]

  const categoryResult = await payload.find({
    collection: 'categories',
    depth: 0,
    fallbackLocale: false,
    locale,
    limit: 1,
    pagination: false,
    overrideAccess: false,
    where: {
      slug: {
        equals: desk,
      },
    },
  })

  const category = categoryResult.docs?.[0]
  let posts: CardPostData[] = []

  if (category) {
    const postResult = await payload.find({
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
          {
            _status: {
              equals: 'published',
            },
          },
          {
            categories: {
              in: [category.id],
            },
          },
        ],
      },
      select: {
        title: true,
        slug: true,
        categories: true,
        meta: true,
      },
    })

    posts = postResult.docs.filter((post) => Boolean(post.title))
  }

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: locale === 'fr' ? 'Accueil' : 'Home', path: `/${locale}` },
    { name: copy.title, path: `/${locale}/${desk}` },
  ])

  return (
    <main className="py-16 md:py-24">
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />

      <div className="insights-shell mb-12 border-b border-[#dfded7] pb-10">
        <p className="eyebrow">{locale === 'fr' ? 'Desk' : 'Desk'}</p>
        <h1 className="mt-4 font-[var(--font-fraunces)] text-[clamp(3rem,7vw,6.2rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#102f52]">
          {copy.title}
        </h1>
        <p className="mt-7 max-w-[66ch] text-lg leading-8 text-[#59636b]">{copy.description}</p>
      </div>

      {posts.length > 0 ? (
        <CollectionArchive locale={locale} placement="archive" posts={posts} />
      ) : (
        <div className="insights-shell">
          <p className="max-w-[62ch] text-[16px] leading-7 text-[#68727a]">
            {locale === 'fr'
              ? 'Aucune analyse publiée dans ce desk pour le moment.'
              : 'No published analysis in this desk yet.'}
          </p>
        </div>
      )}
    </main>
  )
}

export function localizedDeskMetadata(locale: SiteLocale, desk: DeskSlug): Metadata {
  const copy = getMessages(locale).pillars[deskKey[desk]]
  const path = `/${locale}/${desk}`

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: absoluteCanonicalURL(path),
      languages: {
        fr: absoluteCanonicalURL(`/fr/${desk}`),
        en: absoluteCanonicalURL(`/en/${desk}`),
        'x-default': absoluteCanonicalURL(`/fr/${desk}`),
      },
    },
  }
}
