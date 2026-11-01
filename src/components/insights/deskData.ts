import type { Payload, Where } from 'payload'
import type { Post } from '@/payload-types'
import type { SiteLocale } from '@/i18n/config'
import {
  getEditorialRubric,
  postBelongsToRubric,
  type EditorialRubricId,
} from '@/editorial/rubrics'
import { selectHeroPosts } from './heroSelection'

export async function queryDeskPosts(
  payload: Payload,
  desk: EditorialRubricId,
  locale: SiteLocale,
): Promise<Post[]> {
  const rubric = getEditorialRubric(desk)
  const categories = await payload.find({
    collection: 'categories',
    depth: 0,
    fallbackLocale: false,
    locale,
    limit: 50,
    pagination: false,
    overrideAccess: false,
    where: { slug: { in: [rubric.id, ...rubric.legacySlugs] } },
  })
  const ids = categories.docs.map((category) => category.id)
  if (!ids.length) return []
  const where: Where = { and: [{ _status: { equals: 'published' } }, { categories: { in: ids } }] }
  const posts = new Map<number, Post>()
  let page = 1
  while (true) {
    const result = await payload.find({
      collection: 'posts',
      draft: false,
      depth: 1,
      fallbackLocale: false,
      locale,
      limit: 100,
      page,
      pagination: true,
      overrideAccess: false,
      sort: ['-publishedAt', 'id'],
      where,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        categories: true,
        meta: true,
        heroImage: true,
        publishedAt: true,
        authors: true,
        populatedAuthors: true,
        readingTime: true,
        kind: true,
        featured: true,
        _status: true,
        updatedAt: true,
        createdAt: true,
      },
    })
    for (const post of result.docs) {
      // Match the actual localized public article's availability requirements.
      if (!post.title || !post.slug || !post.excerpt || !post.content) continue
      const slugs = (post.categories || []).flatMap((category) =>
        category && typeof category === 'object' && category.slug ? [category.slug] : [],
      )
      if (postBelongsToRubric(desk, slugs)) posts.set(post.id, post)
    }
    if (!result.hasNextPage || !result.nextPage || result.nextPage <= page) break
    page = result.nextPage
  }
  return [...posts.values()]
}

export async function selectDeskHighlights(payload: Payload, posts: Post[], locale: SiteLocale) {
  // Only label a ranking when three eligible articles each have >=5 recorded
  // views and collection has run for a full day. A QA opening is not a trend.
  if (posts.length >= 3) {
    try {
      const ranked = await payload.db.pool.query(
        `SELECT post_id, SUM(views)::text AS views
        FROM insight_article_views_daily
        WHERE post_id = ANY($1::integer[]) AND locale = $2
          AND day >= (NOW() AT TIME ZONE 'Africa/Douala')::date - 6
          AND day <= (NOW() AT TIME ZONE 'Africa/Douala')::date
          AND EXISTS (SELECT 1 FROM insight_article_view_settings
            WHERE id = true AND started_at <= NOW() - INTERVAL '24 hours')
        GROUP BY post_id HAVING SUM(views) >= 5
        ORDER BY SUM(views) DESC, post_id ASC LIMIT 3`,
        [posts.map((post) => post.id), locale],
      )
      const byId = new Map(posts.map((post) => [post.id, post]))
      const popular = ranked.rows.flatMap((row) => {
        const post = byId.get(Number(row.post_id))
        return post ? [post] : []
      })
      if (popular.length === 3) return { kind: 'popular' as const, posts: popular }
    } catch {
      // Highlights remain available when analytics is missing or unavailable.
      payload.logger.warn('Rubric ranking unavailable; using editorial highlights')
    }
  }
  const recent = selectHeroPosts(posts)
  return { kind: 'featured' as const, posts: recent.length ? recent : posts.slice(0, 3) }
}
