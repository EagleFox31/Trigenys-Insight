'use client'

import type { AnchorHTMLAttributes, ReactNode } from 'react'

import type { SiteLocale } from '@/i18n/config'
import { trackEditorialEvent } from '@/lib/analytics/client'

export function TrackedOutboundLink({
  slug,
  locale,
  context,
  children,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  slug: string
  locale: SiteLocale
  context: string
  children: ReactNode
}) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackEditorialEvent('source_click', {
          slug,
          locale,
          context,
        })
        onClick?.(event)
      }}
    >
      {children}
    </a>
  )
}
