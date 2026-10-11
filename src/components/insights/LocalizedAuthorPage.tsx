import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { CollectionArchive } from '@/components/CollectionArchive'
import type { SiteLocale } from '@/i18n/config'
import {
  absoluteCanonicalURL,
  buildAuthorProfileJsonLd,
  serializeJsonLd,
  type PublicAuthorProfile,
} from '@/seo/structuredData'
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

// Users are private; read only the explicit public profile fields, server side.
const queryPublicAuthorFields = cache(
  async ({
    locale,
    slug,
  }: {
    locale: SiteLocale
    slug: string
  }): Promise<Omit<PublicAuthorProfile, 'name'> | null> => {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'users',
      depth: 0,
      fallbackLocale: false,
      locale,
      limit: 200,
      pagination: false,
      overrideAccess: true,
      select: {
        name: true,
        jobTitle: true,
        bio: true,
        expertise: true,
        profileLinks: true,
      },
    })

    const user = result.docs.find((doc) => doc.name && authorSlug(doc.name) === slug)
    if (!user) return null

    return {
      jobTitle: user.jobTitle,
      bio: user.bio,
      expertise: user.expertise,
      profileLinks: user.profileLinks?.map((link) => ({ url: link.url })),
    }
  },
)

const KNOWN_PROFILE_HOSTS: Record<string, string> = {
  'linkedin.com': 'LinkedIn',
  'x.com': 'X',
  'twitter.com': 'X',
  'github.com': 'GitHub',
  'orcid.org': 'ORCID',
  'scholar.google.com': 'Google Scholar',
  'medium.com': 'Medium',
  'substack.com': 'Substack',
}

function profileLinkLabel(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (KNOWN_PROFILE_HOSTS[host]) return KNOWN_PROFILE_HOSTS[host]
    return host.split('.').slice(-2, -1)[0]?.replace(/^\w/, (c) => c.toUpperCase()) || host
  } catch {
    return url
  }
}

export async function LocalizedAuthorPage({
  locale,
  slug,
}: {
  locale: SiteLocale
  slug: string
}) {
  const profile = await queryAuthorProfile({ locale, slug })

  if (!profile) notFound()

  const publicFields = await queryPublicAuthorFields({ locale, slug })
  const authorProfile: PublicAuthorProfile = { name: profile.displayName, ...publicFields }
  const authorJsonLd = buildAuthorProfileJsonLd({ locale, slug, profile: authorProfile })
  const profileLinks = (authorProfile.profileLinks || [])
    .map((link) => link.url)
    .filter((url): url is string => Boolean(url && /^https:\/\//i.test(url)))
  const expertise = (authorProfile.expertise || []).filter((topic) => topic.trim())

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
          {authorProfile.jobTitle && (
            <p className="mt-4 text-[15px] font-semibold uppercase tracking-[0.08em] text-[#c96217]">
              {authorProfile.jobTitle}
            </p>
          )}
          {authorProfile.bio && (
            <p className="mt-6 max-w-[62ch] text-[18px] leading-8 text-[#33393e]">
              {authorProfile.bio}
            </p>
          )}
          {expertise.length > 0 && (
            <ul
              aria-label={locale === 'fr' ? 'Domaines d’expertise' : 'Areas of expertise'}
              className="mt-6 flex flex-wrap gap-2"
            >
              {expertise.map((topic) => (
                <li
                  className="rounded-full border border-[#dfded7] bg-white px-3 py-1 text-[13px] text-[#4e555b]"
                  key={topic}
                >
                  {topic}
                </li>
              ))}
            </ul>
          )}
          {profileLinks.length > 0 && (
            <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
              {profileLinks.map((url) => (
                <a
                  className="font-medium text-[#102f52] underline decoration-[#102f52]/30 underline-offset-4 hover:decoration-[#102f52]"
                  href={url}
                  key={url}
                  rel="me noreferrer"
                  target="_blank"
                >
                  {profileLinkLabel(url)}
                </a>
              ))}
            </p>
          )}
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
  const publicFields = await queryPublicAuthorFields({ locale, slug })
  const description =
    publicFields?.bio?.trim() ||
    (locale === 'fr'
      ? `Articles et analyses de ${profile.displayName} publiés sur Trigenys Insights.`
      : `Articles and analysis by ${profile.displayName} published on Trigenys Insights.`)

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
