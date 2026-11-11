import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Post } from '@/payload-types'
import { LocalizedDeskPage } from '@/components/insights/LocalizedDeskPage'
import { queryDeskPosts, selectDeskHighlights } from '@/components/insights/deskData'
import type { HeroStory } from '@/components/insights/HeroCarousel'
import type { CardPostData } from '@/components/Card'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({})) }))
vi.mock('@/components/insights/deskData', () => ({
  queryDeskPosts: vi.fn(),
  selectDeskHighlights: vi.fn(),
}))
vi.mock('@/components/insights/HeroCarousel', () => ({
  HeroCarousel: ({ stories, sectionId }: { stories: HeroStory[]; sectionId: string }) =>
    stories.length
      ? createElement(
          'section',
          { id: sectionId },
          ...stories.map((story) => createElement('h3', { key: story.id }, story.title)),
        )
      : null,
}))
vi.mock('@/components/CollectionArchive', () => ({
  CollectionArchive: ({ posts }: { posts: CardPostData[] }) =>
    createElement(
      'div',
      null,
      ...posts.map((post) => createElement('h3', { key: post.slug }, post.title)),
    ),
}))

afterEach(cleanup)

describe('rubric highlights and archive presentation', () => {
  it.each([
    ['fr', 1],
    ['fr', 3],
    ['fr', 4],
    ['fr', 44],
    ['en', 1],
    ['en', 4],
  ] as const)(
    'shows the %s inventory of %i articles once, with a truthful total and working count anchor',
    async (locale, count) => {
      const posts = Array.from(
        { length: count },
        (_, i) =>
          ({
            id: i + 1,
            title: `Article ${i + 1}`,
            slug: `article-${i + 1}`,
          }) as Post,
      )
      vi.mocked(queryDeskPosts).mockResolvedValue(posts)
      vi.mocked(selectDeskHighlights).mockResolvedValue({
        kind: 'featured',
        posts: posts.slice(0, 3),
      })
      const { container } = render(await LocalizedDeskPage({ locale, desk: 'tech-ai' }))
      const titles = screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
      expect(titles).toHaveLength(count)
      expect(new Set(titles).size).toBe(count)
      const counter = screen.getByRole('link', {
        name: new RegExp(`${locale === 'fr' ? 'Voir' : 'View'} ${count} `),
      })
      expect(counter.textContent).toContain(String(count))
      expect(container.querySelector(counter.getAttribute('href')!)).not.toBeNull()
      expect(
        screen.queryByRole('heading', { name: /Les autres articles|More stories/ }) !== null,
      ).toBe(count > 3)
      expect(screen.queryByText(/en préparation|in preparation/)).toBeNull()
    },
  )

  it('preserves the empty section message when no localized stories exist', async () => {
    vi.mocked(queryDeskPosts).mockResolvedValue([])
    vi.mocked(selectDeskHighlights).mockResolvedValue({ kind: 'featured', posts: [] })
    render(await LocalizedDeskPage({ locale: 'fr', desk: 'tech-ai' }))
    expect(
      screen.getByText('Les premiers dossiers de cette rubrique sont en préparation.'),
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Tous les articles' })).toBeTruthy()
  })
})
