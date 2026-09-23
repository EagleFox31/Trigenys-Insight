'use client'

import {
  ANALYTICS_SCHEMA_VERSION,
  analyticsContext,
  articleAnalyticsId,
  type EditorialAnalyticsEvent,
  type EditorialAnalyticsProperties,
} from './events'
import { getActiveArticleAttribution } from './attribution'
import { isEditorialAnalyticsEnabled } from './runtime'

function hostAllowsTracking() {
  if (typeof window === 'undefined') return false

  const host = window.location.hostname

  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return false
  if (host.endsWith('.vercel.app')) return false

  return true
}

function buildPayload(properties: EditorialAnalyticsProperties) {
  const attribution =
    properties.slug && !properties.placement
      ? getActiveArticleAttribution(properties.slug, properties.locale)
      : null

  const effectiveProperties: EditorialAnalyticsProperties = {
    ...properties,
    placement: properties.placement || attribution?.placement,
    category: properties.category ?? attribution?.category,
  }

  return {
    schema_version: ANALYTICS_SCHEMA_VERSION,
    article: articleAnalyticsId(effectiveProperties.locale, effectiveProperties.slug),
    slug: effectiveProperties.slug,
    locale: effectiveProperties.locale,
    placement: effectiveProperties.placement,
    category: effectiveProperties.category || undefined,
    context: analyticsContext(effectiveProperties),
    source_id: effectiveProperties.sourceId,
    source_position: effectiveProperties.sourcePosition,
    source_domain: effectiveProperties.sourceDomain,
  }
}

export function trackEditorialEvent(
  event: EditorialAnalyticsEvent,
  properties: EditorialAnalyticsProperties,
) {
  if (typeof window === 'undefined') return
  if (!isEditorialAnalyticsEnabled()) return

  const payload = buildPayload(properties)

  // Playwright/Vitest can inject an in-memory sink. This never performs network I/O
  // and deliberately works on localhost so automated tests cannot pollute production analytics.
  if (Array.isArray(window.__TRIGENYS_ANALYTICS_TEST_EVENTS__)) {
    window.__TRIGENYS_ANALYTICS_TEST_EVENTS__.push({ event, properties: payload })
    return
  }

  if (!hostAllowsTracking()) return

  const posthog = window.posthog
  if (!posthog?.capture) return

  try {
    posthog.capture(event, payload)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Editorial analytics event could not be sent.', { event, error })
    }
  }
}
