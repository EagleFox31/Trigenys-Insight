import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { CollectionArchive } from '@/components/CollectionArchive'
import type { SiteLocale } from '@/i18n/config'
import { absoluteCanonicalURL, serializeJsonLd } from '@/seo/structuredData'
import { authorSlug } from '@/utilities/authorSlug'

const queryAuthorProfile = cache(async ({ locale, slug }: { locale: SiteLocale; slug: string }) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    depth: 1,
    fallbackLocale: false,
    locale,
    limit: 1000,
    pagination: false,
    overrideAccess: false,
    sort: '-publishedAt',
    where: {
      _status: {
        equals: 'published',
      },
    },
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
      authors: true,
      populatedAuthors: true,
    },
  })

  let displayName = ''
  const posts = result.docs.filter((post) => {
    const matchingAuthor = post.populatedAuthors?.find(
      (author) => author?.name && authorSlug(author.name) === slug,
    )

    if (matchingAuthor?.name && !displayName) displayName = matchingAuthor.name
    return Boolean(matchingAuthor)
  })

  if (!displayName || posts.length === 0) return null

  return {
    displayName,
    posts,
  }
})

export async function LocalizedAuthorPage({
  locale,
  slug,
}: {
  locale: SiteLocale
  slug: string
}) {
  const profile = await queryAuthorProfile({ locale, slug })

  if (!profile) notFound()

  const canonicalURL = absoluteCanonicalURL(`/${locale}/authors/${slug}`)
  const authorJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${canonicalURL}#profile`,
    url: canonicalURL,
    mainEntity: {
      '@type': 'Person',
      '@id': `${canonicalURL}#person`,
      name: profile.displayName,
    },
    inLanguage: locale === 'fr' ? 'fr-FR' : 'en',
  }

  return (
    <main className="py-16 md:py-24">
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(authorJsonLd) }}
        type="application/ld+json"
      />

      <div className="insights-shell mb-12">
        <div className="max-w-[820px]">
          <p className="eyebrow">{locale === 'fr' ? 'Auteur' : 'Author'}</p>
          <h1 className="mt-4 font-[var(--font-fraunces)] text-[clamp(2.8rem,6vw,5.7rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-[#102f52]">
            {profile.displayName}
          </h1>
          <p className="mt-6 max-w-[62ch] text-[16px] leading-7 text-[#5b6670]">
            {locale === 'fr'
              ? `${profile.posts.length} publication${profile.posts.length > 1 ? 's' : ''} signée${profile.posts.length > 1 ? 's' : ''} sur Trigenys Insights.`
              : `${profile.posts.length} published ${profile.posts.length === 1 ? 'article' : 'articles'} on Trigenys Insights.`}
          </p>
        </div>
      </div>

      <CollectionArchive locale={locale} placement="archive" posts={profile.posts} />
    </main>
  )
}

export async function localizedAuthorMetadata({
  locale,
  slug,
}: {
  locale: SiteLocale
  slug: string
}): Promise<Metadata> {
  const profile = await queryAuthorProfile({ locale, slug })

  if (!profile) {
    return {
      title: locale === 'fr' ? 'Auteur introuvable' : 'Author not found',
      robots: { index: false, follow: false },
    }
  }

  const otherLocale: SiteLocale = locale === 'fr' ? 'en' : 'fr'
  const translatedProfile = await queryAuthorProfile({ locale: otherLocale, slug })
  const description =
    locale === 'fr'
      ? `Articles et analyses de ${profile.displayName} publiés sur Trigenys Insights.`
      : `Articles and analysis by ${profile.displayName} published on Trigenys Insights.`

  const currentURL = absoluteCanonicalURL(`/${locale}/authors/${slug}`)
  const frenchURL = absoluteCanonicalURL(`/fr/authors/${slug}`)
  const languages: Record<string, string> = {
    [locale]: currentURL,
    'x-default': locale === 'fr' || translatedProfile ? frenchURL : currentURL,
  }

  if (translatedProfile) {
    languages[otherLocale] = absoluteCanonicalURL(`/${otherLocale}/authors/${slug}`)
  }

  return {
    title: profile.displayName,
    description,
    alternates: {
      canonical: currentURL,
      languages,
    },
  }
}
