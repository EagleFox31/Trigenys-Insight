import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  activateArticleAttribution,
  getActiveArticleAttribution,
  rememberArticleAttribution,
} from '@/lib/analytics/attribution'

describe('article analytics attribution', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.useRealTimers()
  })

  it('carries the clicked placement into the matching article view', () => {
    rememberArticleAttribution({
      slug: 'example-article',
      locale: 'fr',
      placement: 'home_analysis',
      category: 'tech',
    })

    expect(activateArticleAttribution('example-article', 'fr')).toMatchObject({
      slug: 'example-article',
      locale: 'fr',
      placement: 'home_analysis',
      category: 'tech',
    })

    expect(getActiveArticleAttribution('example-article', 'fr')).toMatchObject({
      placement: 'home_analysis',
      category: 'tech',
    })
  })

  it('does not attribute a different article', () => {
    rememberArticleAttribution({
      slug: 'first-article',
      locale: 'fr',
      placement: 'home_latest',
    })

    expect(activateArticleAttribution('second-article', 'fr')).toBeNull()
    expect(getActiveArticleAttribution('second-article', 'fr')).toBeNull()
  })

  it('does not reuse stale placement after a direct article load', () => {
    rememberArticleAttribution({
      slug: 'example-article',
      locale: 'fr',
      placement: 'search',
    })

    activateArticleAttribution('example-article', 'fr')
    expect(getActiveArticleAttribution('example-article', 'fr')?.placement).toBe('search')

    expect(activateArticleAttribution('example-article', 'fr')).toBeNull()
    expect(getActiveArticleAttribution('example-article', 'fr')).toBeNull()
  })

  it('drops pending attribution after thirty minutes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-22T16:00:00Z'))

    rememberArticleAttribution({
      slug: 'example-article',
      locale: 'fr',
      placement: 'home_lead',
    })

    vi.setSystemTime(new Date('2026-09-22T16:31:00Z'))

    expect(activateArticleAttribution('example-article', 'fr')).toBeNull()
  })
})
