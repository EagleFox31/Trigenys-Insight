import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { trackEditorialEvent } from '@/lib/analytics/client'
import { isEditorialAnalyticsEnabled } from '@/lib/analytics/runtime'

describe('analytics runtime controls', () => {
  const original = process.env.NEXT_PUBLIC_EDITORIAL_ANALYTICS_ENABLED

  beforeEach(() => {
    window.__TRIGENYS_ANALYTICS_TEST_EVENTS__ = []
    process.env.NEXT_PUBLIC_EDITORIAL_ANALYTICS_ENABLED = undefined
  })

  afterEach(() => {
    window.__TRIGENYS_ANALYTICS_TEST_EVENTS__ = undefined
    process.env.NEXT_PUBLIC_EDITORIAL_ANALYTICS_ENABLED = original
    vi.restoreAllMocks()
  })

  it('defaults to enabled when the kill-switch env is unset', () => {
    expect(isEditorialAnalyticsEnabled(undefined)).toBe(true)
  })

  it.each(['0', 'false', 'FALSE', 'off', 'disabled'])(
    'treats %s as an explicit kill-switch value',
    (value) => {
      expect(isEditorialAnalyticsEnabled(value)).toBe(false)
    },
  )

  it('uses the in-memory test sink on localhost without network analytics', () => {
    const capture = vi.fn()
    window.posthog = { capture }

    trackEditorialEvent('article_view', {
      slug: 'article-test',
      locale: 'fr',
      context: 'article',
    })

    expect(window.__TRIGENYS_ANALYTICS_TEST_EVENTS__).toEqual([
      {
        event: 'article_view',
        properties: expect.objectContaining({
          article: 'fr:article-test',
          slug: 'article-test',
          locale: 'fr',
          context: 'article',
          schema_version: 1,
        }),
      },
    ])
    expect(capture).not.toHaveBeenCalled()
  })

  it('suppresses both provider and test-sink events when kill switch is off', () => {
    process.env.NEXT_PUBLIC_EDITORIAL_ANALYTICS_ENABLED = 'false'
    const capture = vi.fn()
    window.posthog = { capture }

    trackEditorialEvent('article_view', {
      slug: 'article-test',
      locale: 'fr',
      context: 'article',
    })

    expect(window.__TRIGENYS_ANALYTICS_TEST_EVENTS__).toEqual([])
    expect(capture).not.toHaveBeenCalled()
  })
})
