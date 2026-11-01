import type { Payload } from 'payload'

export const VIEW_TIMEZONE = 'Africa/Douala'
export const VIEW_METRIC = 'ip_deduplicated_views_24h'

// A single statement claims the 24-hour window and increments its daily total.
// Concurrent requests for the same article/IP serialize on the primary key;
// failed increments roll back the claim as part of the same statement.
export const COUNT_ARTICLE_VIEW_SQL = `
WITH claimed AS (
  INSERT INTO insight_article_view_guards (post_id, fingerprint, expires_at)
  VALUES ($1, $2, NOW() + INTERVAL '24 hours')
  ON CONFLICT (post_id, fingerprint) DO UPDATE
    SET expires_at = EXCLUDED.expires_at
    WHERE insight_article_view_guards.expires_at <= NOW()
  RETURNING post_id
), counted AS (
  INSERT INTO insight_article_views_daily (post_id, locale, day, views)
  SELECT post_id, $3, (NOW() AT TIME ZONE 'Africa/Douala')::date, 1 FROM claimed
  ON CONFLICT (post_id, locale, day) DO UPDATE
    SET views = insight_article_views_daily.views + 1
  RETURNING views
)
SELECT EXISTS (SELECT 1 FROM counted) AS counted`

export async function recordArticleView(
  pool: Payload['db']['pool'],
  postId: number,
  fingerprint: string,
  locale: 'fr' | 'en',
): Promise<boolean> {
  const result = await pool.query(COUNT_ARTICLE_VIEW_SQL, [postId, fingerprint, locale])
  // Lazy, bounded expiry cleanup. Only expired guards are removed; aggregates
  // contain no fingerprint. SKIP LOCKED never contends with active collectors.
  await pool.query(`DELETE FROM insight_article_view_guards WHERE (post_id, fingerprint) IN (
    SELECT post_id, fingerprint FROM insight_article_view_guards
    WHERE expires_at < NOW() ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED
  )`)
  return Boolean(result.rows[0]?.counted)
}

export async function articleViewSummary(pool: Payload['db']['pool'], postId: number) {
  const result = await pool.query(
    `SELECT
    COALESCE(SUM(views), 0)::text AS total,
    COALESCE(SUM(views) FILTER (WHERE day >= (NOW() AT TIME ZONE 'Africa/Douala')::date - 6), 0)::text AS last7,
    COALESCE(SUM(views) FILTER (WHERE day >= (NOW() AT TIME ZONE 'Africa/Douala')::date - 29), 0)::text AS last30
    FROM insight_article_views_daily WHERE post_id = $1`,
    [postId],
  )
  const settings = await pool.query(
    'SELECT started_at FROM insight_article_view_settings WHERE id = true',
  )
  return {
    metric: VIEW_METRIC,
    timezone: VIEW_TIMEZONE,
    trackingSince: settings.rows[0] ? new Date(settings.rows[0].started_at).toISOString() : null,
    total: Number(result.rows[0]?.total ?? 0),
    last7Days: Number(result.rows[0]?.last7 ?? 0),
    last30Days: Number(result.rows[0]?.last30 ?? 0),
  }
}
