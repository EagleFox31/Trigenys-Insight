import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HeroCarousel, type HeroStory } from '@/components/insights/HeroCarousel'
import { selectHeroPosts } from '@/components/insights/heroSelection'
import type { Post } from '@/payload-types'
import { trackEditorialEvent } from '@/lib/analytics/client'

vi.mock('@/lib/analytics/client', () => ({ trackEditorialEvent: vi.fn() }))
vi.mock('next/image', () => ({
  default: ({ fill: _fill, priority: _priority, ...props }: Record<string, unknown>) =>
    createElement('img', props),
}))
vi.mock('next/link', () => ({
  default: (props: Record<string, unknown>) => createElement('a', props),
}))
const stories: HeroStory[] = [1, 2, 3].map((id) => ({
  id,
  slug: `story-${id}`,
  href: `/fr/posts/story-${id}`,
  title: `Article ${id}`,
  excerpt: 'Une analyse utile.',
  category: 'technology',
  categoryLabel: 'Tech & IA',
  kindLabel: 'Analyse',
  author: 'AgenStudio',
  date: '18 octobre 2026',
  minutes: 6,
  image: null,
}))
let desktop = true
let reduced = false
let visibility = 'visible'
const observers: Array<{ callback: IntersectionObserverCallback; root: boolean }> = []
beforeEach(() => {
  vi.useFakeTimers()
  desktop = true
  reduced = false
  visibility = 'visible'
  observers.length = 0
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced-motion') ? reduced : desktop,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      callback: IntersectionObserverCallback
      constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit) {
        this.callback = callback
        observers.push({ callback, root: options.threshold === 0.25 })
      }
      observe() {
        this.callback(
          [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        )
      }
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
function mount() {
  return render(createElement(HeroCarousel, { stories, locale: 'fr' }))
}
function advance(ms = 8000) {
  act(() => vi.advanceTimersByTime(ms))
}
function active(n: number) {
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(`Article ${n}`)
}

describe('homepage carousel behaviour', () => {
  it('rotates at eight seconds and wraps, exposing only the active slide', () => {
    mount()
    active(1)
    advance(7999)
    active(1)
    advance(1)
    active(2)
    advance()
    active(3)
    advance()
    active(1)
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
  })
  it('pauses on hover and restarts with a full reading interval', () => {
    mount()
    fireEvent.mouseEnter(screen.getByRole('region'))
    advance()
    active(1)
    fireEvent.mouseLeave(screen.getByRole('region'))
    advance()
    active(2)
  })
  it('stays paused after keyboard focus leaves until explicitly restarted', () => {
    mount()
    fireEvent.focus(screen.getByRole('link', { name: 'Article 1' }))
    fireEvent.blur(screen.getByRole('link', { name: 'Article 1' }))
    advance(24000)
    active(1)
    fireEvent.click(screen.getByRole('button', { name: 'Lancer le défilement automatique' }))
    advance()
    active(2)
  })
  it('lets the pause button stop rotation on the first mouse click', () => {
    mount()
    const button = screen.getByRole('button', { name: 'Mettre le défilement en pause' })
    fireEvent.mouseDown(button)
    fireEvent.click(button)
    advance(24000)
    active(1)
  })
  it.each(['mobile', 'reduced'])('disables automatic rotation for %s', (mode) => {
    desktop = mode !== 'mobile'
    reduced = mode === 'reduced'
    mount()
    advance(24000)
    active(1)
    expect(screen.queryByRole('button', { name: 'Mettre le défilement en pause' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Article suivant' }))
    active(2)
  })
  it('supports direct selection and swipes without hijacking vertical scrolling', () => {
    desktop = false
    mount()
    fireEvent.click(screen.getByRole('button', { name: /03.*Article 3/ }))
    active(3)
    const slides = screen.getByRole('group', { name: '3 / 3' }).parentElement!
    fireEvent.touchStart(slides, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchEnd(slides, { changedTouches: [{ clientX: 100, clientY: 105 }] })
    active(1)
    fireEvent.touchStart(slides, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchEnd(slides, { changedTouches: [{ clientX: 190, clientY: 250 }] })
    active(1)
  })
  it('does not rotate offscreen or in a background tab', () => {
    mount()
    act(() =>
      observers
        .find((item) => item.root)!
        .callback(
          [{ isIntersecting: true, intersectionRatio: 0.1 } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
    )
    advance()
    active(1)
    act(() =>
      observers
        .find((item) => item.root)!
        .callback(
          [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
    )
    visibility = 'hidden'
    fireEvent(document, new Event('visibilitychange'))
    advance()
    active(1)
    visibility = 'visible'
    fireEvent(document, new Event('visibilitychange'))
    advance()
    active(2)
  })
  it('only records impressions for the visible slide with its position', () => {
    mount()
    advance(400)
    expect(trackEditorialEvent).toHaveBeenCalledWith(
      'article_card_impression',
      expect.objectContaining({ slug: 'story-1', placement: 'home_hero_1' }),
    )
    expect(
      vi.mocked(trackEditorialEvent).mock.calls.some(([, props]) => props.slug === 'story-2'),
    ).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Article suivant' }))
    advance(400)
    expect(trackEditorialEvent).toHaveBeenCalledWith(
      'article_card_impression',
      expect.objectContaining({ slug: 'story-2', placement: 'home_hero_2' }),
    )
  })
  it('handles one article without empty navigation', () => {
    render(createElement(HeroCarousel, { stories: stories.slice(0, 1), locale: 'en' }))
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('link', { name: 'Read the story' })).toBeTruthy()
    advance(24000)
    active(1)
  })
})

describe('hero editorial selection', () => {
  const now = Date.parse('2026-10-19T00:00:00Z')
  const post = (id: number, age: number, extra = {}) =>
    ({
      id,
      title: `Story ${id}`,
      slug: `story-${id}`,
      _status: 'published',
      publishedAt: new Date(now - age * 86400000).toISOString(),
      ...extra,
    }) as Post
  it('uses the latest three published articles, excluding drafts and future dates', () => {
    expect(
      selectHeroPosts(
        [
          post(1, 3),
          post(2, 1),
          post(3, 0, { _status: 'draft' }),
          post(4, -1),
          post(5, 2),
          post(6, 4),
        ],
        now,
      ).map((p) => p.id),
    ).toEqual([2, 5, 1])
  })
  it('expires older featured flags and allows only one recent pin', () => {
    expect(
      selectHeroPosts(
        [post(1, 0), post(2, 1), post(3, 2, { featured: true }), post(4, 8, { featured: true })],
        now,
      ).map((p) => p.id),
    ).toEqual([3, 1, 2])
    expect(
      selectHeroPosts([post(1, 0), post(4, 8, { featured: true })], now).map((p) => p.id),
    ).toEqual([1, 4])
  })
})
