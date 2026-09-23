'use client'

import type { AnchorHTMLAttributes, ReactNode } from 'react'

import type { SiteLocale } from '@/i18n/config'
import { trackEditorialEvent } from '@/lib/analytics/client'
import { normalizeSourceDomain } from '@/lib/analytics/events'

export function TrackedOutboundLink({
  slug,
  locale,
  context,
  sourceId,
  sourcePosition,
  children,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  slug: string
  locale: SiteLocale
  context: string
  sourceId?: string | number
  sourcePosition?: number
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
          sourceId: sourceId === undefined ? undefined : String(sourceId),
          sourcePosition,
          sourceDomain: normalizeSourceDomain(props.href),
        })
        onClick?.(event)
      }}
    >
      {children}
    </a>
  )
}
