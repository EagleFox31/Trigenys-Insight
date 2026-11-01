# First-party article opening counter

This counter answers "How often was this article opened?" through the existing
editorial API, SDK and MCP. It is independent of the PostHog connector and reuses
the existing Payload PostgreSQL pool, migrations, authentication and read scopes.

## Meaning of a view

A visible, mounted article sends a small same-origin POST to `/api/article-views`.
One trusted IP can count once per stable CMS article ID in a **rolling 24-hour
window**, including across FR/EN and across article slug changes. Refreshes,
concurrent tabs, network retries and language switching do not add a second view.
The language of the first accepted opening receives the view. A second view can
count after 24 hours; repeat requests do not prolong that window.

This is **IP-deduplicated openings**, not unique people or completed readings.
Shared connections undercount people; changing networks can overcount them.
JavaScript-disabled visitors, explicit DNT/GPC opt-outs, logged-in editors,
draft/preview visits and recognized robot user agents are excluded. User-agent
filtering is heuristic, not proof of a human visit. Existing PostHog reading
milestones remain a separate metric.

## Storage and deployment

`20261101_160000_article_views` creates three additive, tracked tables. It never
edits article content or publication state. The singleton `started_at` records
when this counter began, so previous unrecorded visits are not reconstructed.
The production build runs migrations; previews cannot migrate the shared DB.

`insight_article_view_guards` stores only an article-scoped HMAC-SHA256 fingerprint
and a 24-hour expiry. No raw IP, user agent, URL query, cookie or browser identifier
is persisted. The key is `ARTICLE_VIEWS_SECRET`, or the existing `PAYLOAD_SECRET`
with a distinct HMAC purpose. Rotating this key resets deduplication for up to
24 hours. Expired guards are logically inactive and lazily purged (up to 100 on
each collection); after a quiet period physical cleanup resumes with the next
collection. Daily aggregates contain only article ID, first locale, day and count.

The collector trusts only Vercel's ingress-set `x-vercel-forwarded-for`, validates
and canonicalizes IPv4/IPv6 (including mapped IPv4), and is enabled only when
`VERCEL_ENV=production`. Self-hosted deployments need a trusted ingress adapter
before enabling collection; arbitrary forwarded headers are deliberately ignored.
The request also requires the configured origin, JSON, a matching article referer,
a published locale snapshot and a bounded 256-byte body. No request values or
database errors are logged by this collector. Collection errors return 204 and do
not block reading. Counts are estimates, not a fraud-resistant billing metric.

`ARTICLE_VIEWS_ENABLED=false` disables collection server-side; the existing
`NEXT_PUBLIC_EDITORIAL_ANALYTICS_ENABLED=false` disables it on both sides.
No new account, external analytics service or cookie is required.

## Consultation

- Existing `insight_get_post`: `articleViews.total`, `last7Days`, `last30Days`,
  `trackingSince`, metric identifier and timezone, across both languages.
- `insight_get_article_views`: `{postId, days?: 1..365, locale?: "fr"|"en"}`.
- `insight_top_articles`: `{days?: 1..365, limit?: 1..50, locale?: "fr"|"en"}`.
- SDK: `client.getArticleViews(...)` and `client.topArticles(...)`.
- Authenticated `/api/editorial-os` operations: `article-views`, `top-articles`.

Both new tools require only `editorial:read`. Reports contain daily aggregates,
titles and IDs, never fingerprints. Periods use calendar days in Africa/Douala,
including the current day (7 days = today and the preceding 6). The deduplication
window itself remains exactly 24 elapsed hours across midnight. Filtering by
locale selects the language receiving each view, not a separate visitor pool.
`trackingSince` can be later than `fromDate`; those earlier days contain no data.
New tool discovery may require refreshing the installed app; `get_post` makes the
basic totals available through its existing tool immediately after deployment.

## Reuse decisions and sources

The existing AppFactory and Project Automation code searches had no matching IP
counter to reuse. The existing Insight OAuth store already demonstrates atomic
PostgreSQL upserts and expiry cleanup, and the social outbox provides a raw-pool
pattern for auxiliary tables. These conventions are reused instead of installing
a complete analytics platform. Umami's public collector was reviewed for its
server-side identity derivation and robot exclusion; no source was copied and no
new dependency was added.

- Vercel trusted headers: https://vercel.com/docs/headers/request-headers
- Umami reference: https://github.com/umami-software/umami/blob/559e3c607c23d2c72d9bd4f6481bda428255323c/src/app/api/send/route.ts
