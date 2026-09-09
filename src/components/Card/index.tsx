import { cn } from '@/utilities/ui'
import Link from 'next/link'
import React, { Fragment } from 'react'

import type { Post } from '@/payload-types'

import { Media } from '@/components/Media'

export type CardPostData = {
  categories?: null | Array<number | { title?: null | string }>
  meta?: Post['meta']
  slug?: null | string
  title?: null | string
}

export const Card: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  relationTo?: 'posts'
  showCategories?: boolean
  title?: string
}> = (props) => {
  const { className, doc, relationTo, showCategories, title: titleFromProps } = props

  const { slug, categories, meta, title } = doc || {}
  const { description, image: metaImage } = meta || {}

  const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  const titleToUse = titleFromProps || title
  const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  const href = `/${relationTo}/${slug}`

  return (
    <article className={cn('insights-card overflow-hidden bg-card', className)}>
      <div className="insights-card__media relative w-full">
        {!metaImage && <div className="insights-card__placeholder">TI</div>}
        {metaImage && typeof metaImage !== 'string' && <Media resource={metaImage} size="33vw" />}
      </div>
      <div className="insights-card__body">
        {showCategories && hasCategories && (
          <div className="story-kicker">
            {categories?.map((category, index) => {
              if (typeof category === 'object') {
                const { title: titleFromCategory } = category

                const categoryTitle = titleFromCategory || 'Untitled category'

                const isLast = index === categories.length - 1

                return (
                  <Fragment key={index}>
                    {categoryTitle}
                    {!isLast && <Fragment>, &nbsp;</Fragment>}
                  </Fragment>
                )
              }

              return null
            })}
          </div>
        )}
        {titleToUse && (
          <div className="prose">
            <h3 className="insights-card__title">
              <Link className="not-prose" href={href}>
                {titleToUse}
              </Link>
            </h3>
          </div>
        )}
        {description && (
          <div className="insights-card__description">
            <p>{sanitizedDescription}</p>
          </div>
        )}
      </div>
    </article>
  )
}
