'use client'

import {
  ANALYTICS_SCHEMA_VERSION,
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

  const posthog = window.posthog
  if (!posthog?.capture) return

  try {
    posthog.capture(event, {
      schema_version: ANALYTICS_SCHEMA_VERSION,
      article: articleAnalyticsId(properties.locale, properties.slug),
      slug: properties.slug,
      locale: properties.locale,
      placement: properties.placement,
      category: properties.category || undefined,
      context: analyticsContext(properties),
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Editorial analytics event could not be sent.', { event, error })
    }
  }
}
