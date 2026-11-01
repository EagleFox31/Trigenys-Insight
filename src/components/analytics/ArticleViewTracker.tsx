'use client'

import { useEffect, useRef } from 'react'
import { isEditorialAnalyticsEnabled } from '@/lib/analytics/runtime'

export function ArticleViewTracker({
  postId,
  locale,
  enabled,
}: {
  postId: number
  locale: 'fr' | 'en'
  enabled: boolean
}) {
  const sent = useRef('')
  useEffect(() => {
    if (!enabled || !isEditorialAnalyticsEnabled()) return
    const host = window.location.hostname
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.local') ||
      host.endsWith('.vercel.app')
    )
      return
    const key = `${postId}:${locale}`
    const send = () => {
      if (document.visibilityState !== 'visible' || sent.current === key) return
      sent.current = key
      void fetch('/api/article-views', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, locale }),
      }).catch(() => {})
    }
    send()
    document.addEventListener('visibilitychange', send)
    return () => document.removeEventListener('visibilitychange', send)
  }, [enabled, postId, locale])
  return null
}
