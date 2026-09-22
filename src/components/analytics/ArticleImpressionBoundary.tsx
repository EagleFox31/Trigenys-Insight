'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

import type { SiteLocale } from '@/i18n/config'
import type { ArticlePlacement } from '@/lib/analytics/events'
import { trackEditorialEvent } from '@/lib/analytics/client'

const VISIBILITY_THRESHOLD = 0.5
const MIN_VISIBLE_MS = 400

export function ArticleImpressionBoundary({
  slug,
  locale,
  placement,
  category,
  children,
  className,
}: {
  slug: string
  locale: SiteLocale
  placement: ArticlePlacement
  category?: string | null
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const fired = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || fired.current) return

    const clearTimer = () => {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (fired.current) return

        if (entry?.isIntersecting && entry.intersectionRatio >= VISIBILITY_THRESHOLD) {
          if (!timer.current) {
            timer.current = setTimeout(() => {
              fired.current = true
              timer.current = null
              trackEditorialEvent('article_card_impression', {
                slug,
                locale,
                placement,
                category,
              })
              observer.disconnect()
            }, MIN_VISIBLE_MS)
          }
        } else {
          clearTimer()
        }
      },
      { threshold: [VISIBILITY_THRESHOLD] },
    )

    observer.observe(element)

    return () => {
      clearTimer()
      observer.disconnect()
    }
  }, [category, locale, placement, slug])

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  )
}
