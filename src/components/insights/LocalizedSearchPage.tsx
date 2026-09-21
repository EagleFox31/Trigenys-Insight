import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { SiteLocale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import { CollectionArchive } from '@/components/CollectionArchive'
import { Search } from '@/search/Component'

export async function LocalizedSearchPage({
  locale,
  query,
}: {
  locale: SiteLocale
  query?: string
}) {
  const payload = await getPayload({ config: configPromise })
  const t = getMessages(locale).search

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    fallbackLocale: false,
    limit: 12,
    locale,
    overrideAccess: false,
    pagination: false,
    sort: '-publishedAt',
    where: query
      ? {
          and: [
            { _status: { equals: 'published' } },
            {
              or: [
                { title: { like: query } },
                { excerpt: { like: query } },
                { 'meta.description': { like: query } },
                { 'meta.title': { like: query } },
              ],
            },
          ],
        }
      : { _status: { equals: 'published' } },
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
  })

  const translatedDocs = posts.docs.filter((post) => Boolean(post.title))

  return (
    <div className="pt-24 pb-24">
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none text-center">
          <h1 className="mb-8 lg:mb-16">{t.title}</h1>
          <div className="max-w-[50rem] mx-auto">
            <Search locale={locale} />
          </div>
        </div>
      </div>

      {translatedDocs.length > 0 ? (
        <CollectionArchive locale={locale} posts={translatedDocs} />
      ) : (
        <div className="container">{t.noResults}</div>
      )}
    </div>
  )
}

export function localizedSearchMetadata(locale: SiteLocale): Metadata {
  const t = getMessages(locale).search

  return {
    title: t.title,
    description: t.description,
    alternates: {
      canonical: `/${locale}/search`,
      languages: {
        fr: '/fr/search',
        en: '/en/search',
      },
    },
  }
}
