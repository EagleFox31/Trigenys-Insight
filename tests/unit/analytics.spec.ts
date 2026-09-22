import { describe, expect, it } from 'vitest'

import {
  analyticsContext,
  articleAnalyticsId,
  type EditorialAnalyticsEvent,
} from '@/lib/analytics/events'
import { readingEventsToEmit } from '@/lib/analytics/reading'

describe('editorial analytics contract', () => {
  it('builds a stable article identifier from locale and slug', () => {
    expect(articleAnalyticsId('fr', 'mon-article')).toBe('fr:mon-article')
    expect(articleAnalyticsId('en', 'my-article')).toBe('en:my-article')
  })

  it('prefers explicit context over placement and category', () => {
    expect(
      analyticsContext({
        locale: 'fr',
        placement: 'home_latest',
        category: 'technology',
        context: 'source-2',
      }),
    ).toBe('source-2')
  })

  it('combines placement and category when both exist', () => {
    expect(
      analyticsContext({
        locale: 'fr',
        placement: 'home_latest',
        category: 'technology',
      }),
    ).toBe('home_latest:technology')
  })
})

describe('reading milestone deduplication', () => {
  it('emits milestones crossed by a large scroll jump in order', () => {
    const fired = new Set<EditorialAnalyticsEvent>()

    expect(readingEventsToEmit(0.8, fired)).toEqual([
      'article_read_25',
      'article_read_50',
      'article_read_75',
    ])
  })

  it('does not emit a milestone that already fired', () => {
    const fired = new Set<EditorialAnalyticsEvent>([
      'article_read_25',
      'article_read_50',
    ])

    expect(readingEventsToEmit(0.76, fired)).toEqual(['article_read_75'])
  })

  it('uses 95 percent as the completion threshold', () => {
    const fired = new Set<EditorialAnalyticsEvent>([
      'article_read_25',
      'article_read_50',
      'article_read_75',
    ])

    expect(readingEventsToEmit(0.94, fired)).toEqual([])
    expect(readingEventsToEmit(0.95, fired)).toEqual(['article_read_complete'])
  })

  it('clamps invalid progress values safely', () => {
    expect(readingEventsToEmit(-4, new Set())).toEqual([])
    expect(readingEventsToEmit(4, new Set())).toEqual([
      'article_read_25',
      'article_read_50',
      'article_read_75',
      'article_read_complete',
    ])
  })
})
