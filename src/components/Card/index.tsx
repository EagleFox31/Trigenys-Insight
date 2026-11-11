import { cn } from '@/utilities/ui'
import Link from 'next/link'
import React, { Fragment } from 'react'

import type { Post } from '@/payload-types'
import type { SiteLocale } from '@/i18n/config'
import { withLocale } from '@/i18n/config'
import { cardCategoryLinks } from './categoryLinks'
import type { ArticlePlacement } from '@/lib/analytics/events'

import { Media } from '@/components/Media'
import { ArticleImpressionBoundary } from '@/components/analytics/ArticleImpressionBoundary'
import { TrackedArticleLink } from '@/components/analytics/TrackedArticleLink'

export type CardPostData = {
  categories?: null | Array<number | { slug?: null | string; title?: null | string }>
  meta?: Post['meta']
  heroImage?: Post['heroImage']
  slug?: null | string
  title?: null | string
}

export const Card: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  locale?: SiteLocale
  placement?: ArticlePlacement
  relationTo?: 'posts'
  showCategories?: boolean
  title?: string
}> = (props) => {
  const {
    className,
    doc,
    locale = 'fr',
    placement,
    relationTo,
    showCategories,
    title: titleFromProps,
  } = props

  const { slug, categories, meta, title, heroImage } = doc || {}
  const { description, image: metaImage } = meta || {}
  // Article covers are the canonical card artwork. SEO metadata images are a
  // fallback only; some legacy generated OG derivatives no longer exist.
  const cover =
    heroImage && typeof heroImage === 'object' && heroImage.url
      ? heroImage
      : metaImage && typeof metaImage === 'object' && metaImage.url
        ? metaImage
        : null

  const categoryLinks = cardCategoryLinks(categories, locale)
  const titleToUse = titleFromProps || title
  const sanitizedDescription = description?.replace(/\s/g, ' ')
  const href = withLocale(locale, `/${relationTo}/${slug}`)
  const firstCategory = categories?.find(
    (category): category is { slug?: null | string; title?: null | string } =>
      typeof category === 'object' && category !== null,
  )
  const primaryCategory = firstCategory?.slug || null

  const titleLink =
    placement && slug ? (
      <TrackedArticleLink
        className="relative z-20 not-prose"
        href={href}
        locale={locale}
        placement={placement}
        category={primaryCategory}
        slug={slug}
      >
        {titleToUse}
      </TrackedArticleLink>
    ) : (
      <Link className="relative z-20 not-prose" href={href}>
        {titleToUse}
      </Link>
    )

  const article = (
    <article
      className={cn('insights-card relative cursor-pointer overflow-hidden bg-card', className)}
    >
      {slug &&
        relationTo &&
        (placement ? (
          <TrackedArticleLink
            aria-hidden="true"
            className="absolute inset-0 z-10"
            href={href}
            locale={locale}
            placement={placement}
            category={primaryCategory}
            slug={slug}
            tabIndex={-1}
          >
            <span className="sr-only">{titleToUse}</span>
          </TrackedArticleLink>
        ) : (
          <Link aria-hidden="true" className="absolute inset-0 z-10" href={href} tabIndex={-1}>
            <span className="sr-only">{titleToUse}</span>
          </Link>
        ))}
      <div className="insights-card__media relative w-full">
        {!cover && <div className="insights-card__placeholder">TI</div>}
        {cover && <Media resource={cover} size="33vw" />}
      </div>
      <div className="insights-card__body">
        {showCategories && categoryLinks.length > 0 && (
          <div className="story-kicker">
            {categoryLinks.map(({ href: categoryPath, label, key }, index) => (
              <Fragment key={key}>
                {index > 0 && <Fragment>, &nbsp;</Fragment>}
                {categoryPath ? (
                  <Link className="relative z-20" href={categoryPath}>
                    {label}
                  </Link>
                ) : (
                  label
                )}
              </Fragment>
            ))}
          </div>
        )}
        {titleToUse && (
          <div className="prose">
            <h3 className="insights-card__title">{titleLink}</h3>
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

  if (!placement || !slug) return article

  return (
    <ArticleImpressionBoundary
      category={primaryCategory}
      locale={locale}
      placement={placement}
      slug={slug}
    >
      {article}
    </ArticleImpressionBoundary>
  )
}
