import type { SiteLocale } from '@/i18n/config'
import { withLocale } from '@/i18n/config'
import { categoryLabel, formatPostDate } from '@/i18n/content'
import { getMessages } from '@/i18n/messages'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { authorSlug } from '@/utilities/authorSlug'
import { ArticleShareButtons } from '@/components/insights/ArticleShareButtons'
import { absoluteCanonicalURL } from '@/seo/structuredData'

export const PostHero: React.FC<{
  locale: SiteLocale
  post: Post
  analyticsEnabled?: boolean
}> = ({ locale, post, analyticsEnabled = true }) => {
  const {
    categories,
    excerpt,
    heroImage,
    populatedAuthors,
    publishedAt,
    readingTime,
    title,
    updatedAt,
  } = post
  const t = getMessages(locale).post
  const publicAuthors = populatedAuthors?.filter((author) => Boolean(author?.name)) || []

  const showUpdatedAt =
    Boolean(publishedAt && updatedAt) &&
    new Date(updatedAt).getTime() - new Date(publishedAt as string).getTime() >= 24 * 60 * 60 * 1000

  return (
    <header className="post-hero">
      <div className="insights-shell post-hero__copy">
        <Link className="post-hero__back" href={withLocale(locale, '/posts')}>
          <ArrowLeft aria-hidden="true" size={15} strokeWidth={1.8} />
          {t.back}
        </Link>

        <div className="story-kicker">
          {categories?.map((category, index) => {
            if (typeof category === 'object' && category !== null) {
              const isLast = index === categories.length - 1

              return (
                <React.Fragment key={category.id || index}>
                  <Link href={withLocale(locale, `/${category.slug}`)}>
                    {categoryLabel(category, locale)}
                  </Link>
                  {!isLast && <React.Fragment> · </React.Fragment>}
                </React.Fragment>
              )
            }
            return null
          })}
        </div>

        <h1>{title}</h1>
        {excerpt && <p className="post-hero__excerpt">{excerpt}</p>}

        <div className="post-hero__meta">
          {publicAuthors.length > 0 && (
            <span>
              {t.by}{' '}
              {publicAuthors.map((author, index) => {
                const name = author.name as string
                const isLast = index === publicAuthors.length - 1
                const isBeforeLast = index === publicAuthors.length - 2
                const separator = isLast
                  ? ''
                  : isBeforeLast
                    ? locale === 'fr'
                      ? ' et '
                      : ' and '
                    : ', '

                return (
                  <React.Fragment key={author.id || name}>
                    <Link href={withLocale(locale, `/authors/${authorSlug(name)}`)}>{name}</Link>
                    {separator}
                  </React.Fragment>
                )
              })}
            </span>
          )}
          {publishedAt && (
            <time dateTime={publishedAt}>{formatPostDate(publishedAt, locale, true)}</time>
          )}
          {showUpdatedAt && (
            <span>
              {t.updated}{' '}
              <time dateTime={updatedAt}>{formatPostDate(updatedAt, locale, true)}</time>
            </span>
          )}
          {readingTime && (
            <span>
              {readingTime} {t.minutesReading}
            </span>
          )}
        </div>
        {post.slug && (
          <ArticleShareButtons
            analyticsEnabled={analyticsEnabled}
            locale={locale}
            slug={post.slug}
            title={title}
            url={absoluteCanonicalURL(`/${locale}/posts/${post.slug}`)}
          />
        )}
      </div>
      {heroImage && typeof heroImage !== 'string' && (
        <div className="insights-shell post-hero__image">
          <Media priority imgClassName="object-cover" resource={heroImage} />
        </div>
      )}
    </header>
  )
}
