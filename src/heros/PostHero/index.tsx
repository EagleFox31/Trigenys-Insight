import type { SiteLocale } from '@/i18n/config'
import { withLocale } from '@/i18n/config'
import { categoryLabel, formatPostDate } from '@/i18n/content'
import { getMessages } from '@/i18n/messages'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatAuthors } from '@/utilities/formatAuthors'

export const PostHero: React.FC<{
  locale: SiteLocale
  post: Post
}> = ({ locale, post }) => {
  const { categories, excerpt, heroImage, populatedAuthors, publishedAt, readingTime, title } = post
  const t = getMessages(locale).post

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''

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
                <React.Fragment key={index}>
                  {categoryLabel(category, locale)}
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
          {hasAuthors && <span>{t.by} {formatAuthors(populatedAuthors)}</span>}
          {publishedAt && <time dateTime={publishedAt}>{formatPostDate(publishedAt, locale, true)}</time>}
          {readingTime && <span>{readingTime} {t.minutesReading}</span>}
        </div>
      </div>
      {heroImage && typeof heroImage !== 'string' && (
        <div className="insights-shell post-hero__image">
          <Media priority imgClassName="object-cover" resource={heroImage} />
        </div>
      )}
    </header>
  )
}
