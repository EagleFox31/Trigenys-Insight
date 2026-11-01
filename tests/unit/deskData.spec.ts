import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import type { Post } from '@/payload-types'
import { queryDeskPosts, selectDeskHighlights } from '@/components/insights/deskData'
import { toHeroStory } from '@/components/insights/heroStories'

const post = (id: number, extra: Partial<Post> = {}): Post =>
  ({
    id,
    title: `Article ${id}`,
    slug: `article-${id}`,
    excerpt: 'Une analyse avec une vraie introduction.',
    _status: 'published',
    publishedAt: new Date(Date.now() - id * 3600000).toISOString(),
    categories: [{ id: 1, slug: 'tech-ai', title: 'Tech & IA' }],
    content: {
      root: {
        type: 'root',
        children: [{ type: 'paragraph', version: 1 }],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    },
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...extra,
  }) as Post

function setup(pages: Post[][] = []) {
  const find = vi.fn(async (args: { collection: string; page?: number }) => {
    if (args.collection === 'categories') return { docs: [{ id: 1 }, { id: 2 }] }
    const page = args.page ?? 1
    return {
      docs: pages[page - 1] ?? [],
      hasNextPage: page < pages.length,
      nextPage: page < pages.length ? page + 1 : null,
    }
  })
  const query = vi.fn(
    async (
      _sql: string,
      _values: unknown[],
    ): Promise<{ rows: Array<{ post_id: number; views: string }> }> => ({
      rows: [],
    }),
  )
  const logger = { warn: vi.fn() }
  return {
    find,
    query,
    logger,
    payload: { find, db: { pool: { query } }, logger } as unknown as Payload,
  }
}

describe('localized rubric inventory', () => {
  it('counts all public candidates across pages rather than stopping at 24 and deduplicates IDs', async () => {
    const first = Array.from({ length: 26 }, (_, i) => post(i + 1))
    const s = setup([first, [post(26), post(27)]])
    const result = await queryDeskPosts(s.payload, 'tech-ai', 'fr')
    expect(result).toHaveLength(27)
    expect(result.map((p) => p.id)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1))
    expect(s.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        page: 2,
        draft: false,
        overrideAccess: false,
        locale: 'fr',
        fallbackLocale: false,
        where: { and: [{ _status: { equals: 'published' } }, { categories: { in: [1, 2] } }] },
      }),
    )
  })
  it('excludes unavailable translations and honors canonical categories over legacy aliases', async () => {
    const s = setup([
      [
        post(1),
        post(2, { title: '' }),
        post(3, { excerpt: '' }),
        post(4, { content: null as unknown as Post['content'] }),
        post(5, { slug: '' }),
        post(6, { categories: [{ id: 2, slug: 'technology' }] as Post['categories'] }),
        post(7, {
          categories: [
            { id: 2, slug: 'technology' },
            { id: 3, slug: 'business-finance' },
          ] as Post['categories'],
        }),
      ],
    ])
    const result = await queryDeskPosts(s.payload, 'tech-ai', 'en')
    expect(result.map((p) => p.id)).toEqual([1, 6])
    expect(s.find).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en', fallbackLocale: false }),
    )
  })
  it('does not query unrelated articles when the rubric has no categories', async () => {
    const s = setup()
    s.find.mockResolvedValue({ docs: [] } as never)
    expect(await queryDeskPosts(s.payload, 'gaming-culture', 'fr')).toEqual([])
    expect(s.find).toHaveBeenCalledTimes(1)
  })
})

describe('truthful rubric highlights', () => {
  it('uses editorial highlights when no ranking or only a few viewed articles exist', async () => {
    const posts = [post(1), post(2), post(3), post(4)]
    const s = setup()
    s.query.mockResolvedValue({
      rows: [
        { post_id: 1, views: '5' },
        { post_id: 2, views: '5' },
      ],
    })
    const result = await selectDeskHighlights(s.payload, posts, 'fr')
    expect(result.kind).toBe('featured')
    expect(result.posts.map((p) => p.id)).toEqual([1, 2, 3])
  })
  it('scopes the real seven-day ranking to visible article IDs and locale', async () => {
    const s = setup()
    s.query.mockResolvedValue({
      rows: [
        { post_id: 4, views: '20' },
        { post_id: 2, views: '12' },
        { post_id: 1, views: '5' },
      ],
    })
    const result = await selectDeskHighlights(s.payload, [post(1), post(2), post(3), post(4)], 'en')
    expect(result.kind).toBe('popular')
    expect(result.posts.map((p) => p.id)).toEqual([4, 2, 1])
    expect(s.query).toHaveBeenCalledWith(
      expect.stringContaining("started_at <= NOW() - INTERVAL '24 hours'"),
      [[1, 2, 3, 4], 'en'],
    )
    expect(s.query.mock.calls[0]?.[0]).toContain('HAVING SUM(views) >= 5')
    expect(s.query.mock.calls[0]?.[0]).toContain("AT TIME ZONE 'Africa/Douala')::date - 6")
  })
  it('falls back on an analytics outage and for a rubric with fewer than three articles', async () => {
    const s = setup()
    s.query.mockRejectedValue(new Error('database unavailable'))
    expect((await selectDeskHighlights(s.payload, [post(1), post(2), post(3)], 'fr')).kind).toBe(
      'featured',
    )
    expect(s.logger.warn).toHaveBeenCalledWith(
      'Rubric ranking unavailable; using editorial highlights',
    )
    s.query.mockClear()
    const result = await selectDeskHighlights(s.payload, [post(1)], 'fr')
    expect(result.posts.map((p) => p.id)).toEqual([1])
    expect(s.query).not.toHaveBeenCalled()
  })
  it('does not promote a ranked ID outside the current section', async () => {
    const s = setup()
    s.query.mockResolvedValue({
      rows: [
        { post_id: 99, views: '99' },
        { post_id: 2, views: '12' },
        { post_id: 1, views: '5' },
      ],
    })
    expect((await selectDeskHighlights(s.payload, [post(1), post(2), post(3)], 'fr')).kind).toBe(
      'featured',
    )
  })
})

describe('shared landing story presentation', () => {
  it('uses the localized article link and actual hero cover, with SEO image fallback', () => {
    const hero = { id: 8, url: 'https://example.com/hero.webp', alt: 'Hero cover' } as NonNullable<
      Post['heroImage']
    >
    const seo = { id: 9, url: 'https://example.com/seo.webp', alt: 'SEO cover' } as NonNullable<
      NonNullable<Post['meta']>['image']
    >
    const story = toHeroStory(post(1, { heroImage: hero, meta: { image: seo } }), 'en')
    expect(story.href).toBe('/en/posts/article-1')
    expect(story.image?.url).toBe('https://example.com/hero.webp')
    expect(toHeroStory(post(1, { meta: { image: seo } }), 'fr').image?.url).toBe(
      'https://example.com/seo.webp',
    )
  })
})
