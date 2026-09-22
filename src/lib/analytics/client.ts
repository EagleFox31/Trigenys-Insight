'use client'

import {
  ANALYTICS_SCHEMA_VERSION,
  analyticsContext,
  articleAnalyticsId,
  type EditorialAnalyticsEvent,
  type EditorialAnalyticsProperties,
} from './events'
import { getActiveArticleAttribution } from './attribution'

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

  const attribution =
    properties.slug && !properties.placement
      ? getActiveArticleAttribution(properties.slug, properties.locale)
      : null

  const effectiveProperties: EditorialAnalyticsProperties = {
    ...properties,
    placement: properties.placement || attribution?.placement,
    category: properties.category ?? attribution?.category,
  }

  try {
    posthog.capture(event, {
      schema_version: ANALYTICS_SCHEMA_VERSION,
      article: articleAnalyticsId(effectiveProperties.locale, effectiveProperties.slug),
      slug: effectiveProperties.slug,
      locale: effectiveProperties.locale,
      placement: effectiveProperties.placement,
      category: effectiveProperties.category || undefined,
      context: analyticsContext(effectiveProperties),
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Editorial analytics event could not be sent.', { event, error })
    }
  }
}
