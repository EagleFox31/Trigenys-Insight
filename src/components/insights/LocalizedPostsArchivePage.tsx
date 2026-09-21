import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { SiteLocale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'

export async function LocalizedPostsArchivePage({
  locale,
  pageNumber = 1,
}: {
  locale: SiteLocale
  pageNumber?: number
}) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) notFound()

  const payload = await getPayload({ config: configPromise })
  const t = getMessages(locale).archive

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    fallbackLocale: false,
    limit: 12,
    locale,
    page: pageNumber,
    overrideAccess: false,
    sort: '-publishedAt',
    where: { _status: { equals: 'published' } },
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
  })

  const translatedDocs = posts.docs.filter((post) => Boolean(post.title))

  return (
    <div className="insights-archive">
      <div className="container insights-archive__heading">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>{t.description}</p>
      </div>

      <div className="container mb-8">
        <PageRange
          currentPage={posts.page}
          limit={12}
          locale={locale}
          totalDocs={posts.totalDocs}
        />
      </div>

      <CollectionArchive locale={locale} posts={translatedDocs} />

      <div className="container">
        {posts.totalPages > 1 && posts.page && (
          <Pagination locale={locale} page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
    </div>
  )
}

export function localizedArchiveMetadata(locale: SiteLocale, pageNumber?: number): Metadata {
  const french = locale === 'fr'
  const pageSuffix = pageNumber && pageNumber > 1 ? (french ? ` — page ${pageNumber}` : ` — page ${pageNumber}`) : ''

  return {
    title: `${french ? 'Analyses' : 'Analysis'}${pageSuffix}`,
    description: french
      ? 'Les analyses publiées par Trigenys Insights.'
      : 'Analysis published by Trigenys Insights.',
    alternates: {
      canonical: `/${locale}/posts${pageNumber && pageNumber > 1 ? `/page/${pageNumber}` : ''}`,
      languages: {
        fr: `/fr/posts${pageNumber && pageNumber > 1 ? `/page/${pageNumber}` : ''}`,
        en: `/en/posts${pageNumber && pageNumber > 1 ? `/page/${pageNumber}` : ''}`,
      },
    },
  }
}
