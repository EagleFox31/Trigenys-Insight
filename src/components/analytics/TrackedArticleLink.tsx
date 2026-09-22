'use client'

import Link from 'next/link'
import type { ComponentProps, MouseEvent, ReactNode } from 'react'

import type { SiteLocale } from '@/i18n/config'
import {
  type ArticlePlacement,
} from '@/lib/analytics/events'
import { trackEditorialEvent } from '@/lib/analytics/client'
import { rememberArticleAttribution } from '@/lib/analytics/attribution'

type LinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'onClick'>

export function TrackedArticleLink({
  href,
  slug,
  locale,
  placement,
  category,
  children,
  onClick,
  ...props
}: LinkProps & {
  href: string
  slug: string
  locale: SiteLocale
  placement: ArticlePlacement
  category?: string | null
  children: ReactNode
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        rememberArticleAttribution({
          slug,
          locale,
          placement,
          category,
        })
        trackEditorialEvent('article_card_click', {
          slug,
          locale,
          placement,
          category,
        })
        onClick?.(event)
      }}
    >
      {children}
    </Link>
  )
}
