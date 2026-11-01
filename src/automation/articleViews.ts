import type { PayloadRequest } from 'payload'
import type {
  ArticleViewsInput,
  ArticleViewsResult,
} from '../../packages/insight-automation/src/schema'
import { VIEW_METRIC, VIEW_TIMEZONE } from '@/lib/articleViews/store'
import { EditorialError } from './errors'

export async function getArticleViews(
  req: PayloadRequest,
  input: ArticleViewsInput,
): Promise<ArticleViewsResult> {
  const days = input.days ?? 30
  const locale = input.locale ?? null
  const settings = await req.payload.db.pool.query(
    `SELECT started_at,
    (NOW() AT TIME ZONE 'Africa/Douala')::date::text AS today,
    ((NOW() AT TIME ZONE 'Africa/Douala')::date - ($1::integer - 1))::text AS first_day
    FROM insight_article_view_settings WHERE id = true`,
    [days],
  )
  const period = settings.rows[0]
  if (!period) throw new EditorialError(503, 'article_views_unavailable')
  const result = await req.payload.db.pool.query(
    `SELECT post_id,
    SUM(views)::text AS views,
    COALESCE(SUM(views) FILTER (WHERE locale = 'fr'), 0)::text AS fr,
    COALESCE(SUM(views) FILTER (WHERE locale = 'en'), 0)::text AS en
    FROM insight_article_views_daily
    WHERE day >= $1::date AND day <= $2::date
      AND ($3::integer IS NULL OR post_id = $3)
      AND ($4::text IS NULL OR locale = $4)
    GROUP BY post_id ORDER BY SUM(views) DESC, post_id ASC LIMIT $5`,
    [
      period.first_day,
      period.today,
      input.postId ?? null,
      locale,
      input.postId ? 1 : (input.limit ?? 10),
    ],
  )
  const ids = input.postId ? [input.postId] : result.rows.map((row) => Number(row.post_id))
  const posts = ids.length
    ? await req.payload.find({
        collection: 'posts',
        where: { id: { in: ids } },
        draft: false,
        locale: locale ?? 'fr',
        fallbackLocale: false,
        depth: 0,
        limit: ids.length,
        pagination: false,
        overrideAccess: true,
        req,
        select: { title: true, slug: true },
      })
    : { docs: [] }
  if (input.postId && !posts.docs.some((post) => post.id === input.postId))
    throw new EditorialError(404, 'post_not_found')
  const totals = new Map<number, { views: string; fr: string; en: string }>(
    result.rows.map((row) => [Number(row.post_id), row]),
  )
  return {
    ok: true,
    metric: VIEW_METRIC,
    timezone: VIEW_TIMEZONE,
    countingRule:
      'One view per article and IP per rolling 24 hours, shared across FR/EN. Not unique people.',
    trackingSince: new Date(period.started_at).toISOString(),
    fromDate: period.first_day,
    toDate: period.today,
    days,
    locale,
    docs: ids.map((postId) => {
      const post = posts.docs.find((post) => post.id === postId)
      const counts = totals.get(postId)
      return {
        postId,
        title: post?.title ?? null,
        slug: post?.slug ?? null,
        views: Number(counts?.views ?? 0),
        byLocale: { fr: Number(counts?.fr ?? 0), en: Number(counts?.en ?? 0) },
      }
    }),
  }
}
