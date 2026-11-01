// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://insight.example/fr/posts/splashark"}
import React, { StrictMode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArticleViewTracker } from '@/components/analytics/ArticleViewTracker'

const tracker = (postId = 44, enabled = true) =>
  React.createElement(ArticleViewTracker, { postId, locale: 'fr', enabled })
const visibility = (state: 'visible' | 'hidden') =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_EDITORIAL_ANALYTICS_ENABLED', 'true')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 204 })),
  )
  visibility('visible')
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('article opening signal', () => {
  it('sends once even with React StrictMode, without browser identifiers or storage', () => {
    render(React.createElement(StrictMode, {}, tracker()))
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      '/api/article-views',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({ postId: 44, locale: 'fr' }),
      }),
    )
  })
  it('waits until a background tab is visible and ignores later visibility changes', () => {
    visibility('hidden')
    render(tracker())
    expect(fetch).not.toHaveBeenCalled()
    act(() => {
      visibility('visible')
      document.dispatchEvent(new Event('visibilitychange'))
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('sends a fresh signal for a different article during client navigation', () => {
    const page = render(tracker())
    page.rerender(tracker(54))
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/article-views',
      expect.objectContaining({ body: JSON.stringify({ postId: 54, locale: 'fr' }) }),
    )
  })
  it('honors draft mode and the global analytics kill switch', () => {
    const page = render(tracker(44, false))
    expect(fetch).not.toHaveBeenCalled()
    vi.stubEnv('NEXT_PUBLIC_EDITORIAL_ANALYTICS_ENABLED', 'false')
    page.rerender(tracker(44, true))
    expect(fetch).not.toHaveBeenCalled()
  })
})
