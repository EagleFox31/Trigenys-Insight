import { formatDateTime } from 'src/utilities/formatDateTime'
import React from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatAuthors } from '@/utilities/formatAuthors'

export const PostHero: React.FC<{
  post: Post
}> = ({ post }) => {
  const { categories, excerpt, heroImage, populatedAuthors, publishedAt, readingTime, title } = post

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''

  return (
    <header className="post-hero">
      <div className="insights-shell post-hero__copy">
        <div className="story-kicker">
          {categories?.map((category, index) => {
            if (typeof category === 'object' && category !== null) {
              const { title: categoryTitle } = category

              const titleToUse = categoryTitle || 'Analyse'

              const isLast = index === categories.length - 1

              return (
                <React.Fragment key={index}>
                  {titleToUse}
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
          {hasAuthors && <span>Par {formatAuthors(populatedAuthors)}</span>}
          {publishedAt && <time dateTime={publishedAt}>{formatDateTime(publishedAt)}</time>}
          {readingTime && <span>{readingTime} min de lecture</span>}
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
