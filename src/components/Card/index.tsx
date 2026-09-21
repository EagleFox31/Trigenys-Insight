import { cn } from '@/utilities/ui'
import Link from 'next/link'
import React, { Fragment } from 'react'

import type { Post } from '@/payload-types'
import type { SiteLocale } from '@/i18n/config'
import { withLocale } from '@/i18n/config'
import { categoryLabel } from '@/i18n/content'

import { Media } from '@/components/Media'

export type CardPostData = {
  categories?: null | Array<number | { slug?: null | string; title?: null | string }>
  meta?: Post['meta']
  slug?: null | string
  title?: null | string
}

export const Card: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  locale?: SiteLocale
  relationTo?: 'posts'
  showCategories?: boolean
  title?: string
}> = (props) => {
  const { className, doc, locale = 'fr', relationTo, showCategories, title: titleFromProps } = props

  const { slug, categories, meta, title } = doc || {}
  const { description, image: metaImage } = meta || {}

  const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  const titleToUse = titleFromProps || title
  const sanitizedDescription = description?.replace(/\s/g, ' ')
  const href = withLocale(locale, `/${relationTo}/${slug}`)

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
                const isLast = index === categories.length - 1
                const label = category.slug
                  ? categoryLabel(category as never, locale)
                  : category.title || (locale === 'fr' ? 'Analyse' : 'Analysis')

                return (
                  <Fragment key={index}>
                    {label}
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
