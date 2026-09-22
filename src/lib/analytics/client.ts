'use client'

import { track } from '@vercel/analytics'

import {
  analyticsContext,
  articleAnalyticsId,
  type EditorialAnalyticsEvent,
  type EditorialAnalyticsProperties,
} from './events'

function shouldTrack() {
  if (typeof window === 'undefined') return false

  const host = window.location.hostname

  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return false
  if (host.endsWith('.vercel.app')) return false

  return true
}

export function trackEditorialEvent(
  event: EditorialAnalyticsEvent,
  properties: EditorialAnalyticsProperties,
) {
  if (!shouldTrack()) return

  const payload = {
    article: articleAnalyticsId(properties.locale, properties.slug),
    context: analyticsContext(properties),
  }

  try {
    track(event, payload)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Editorial analytics event could not be sent.', { event, error })
    }
  }
}
