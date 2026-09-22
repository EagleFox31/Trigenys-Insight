# Cloudflare Workers pilot

This pilot exists to answer one question with evidence:

> Can Trigenys Insights run reliably on Cloudflare Workers without giving up the current Vercel production deployment?

The answer must come from a parallel preview deployment, not from a DNS cutover.

## Current production

Production remains unchanged:

```text
insight.trigenys.com
        │
        ▼
      Vercel
        │
   ┌────┴────┐
   │         │
 Neon     Vercel Blob
   │
PostgreSQL   media
```

Do not remove the Vercel project, its environment variables, its Blob store, or the current DNS record during the pilot.

## Pilot topology

The first Cloudflare target should be isolated:

```text
<worker-name>.<account>.workers.dev
              │
              ▼
       Cloudflare Workers
              │
              ▼
         Neon PostgreSQL
```

Existing published media may continue to resolve from their stored Vercel Blob URLs while public rendering is validated.

New media uploads are **not** considered production-ready in the first pilot. Durable uploads on Workers need an R2 storage path before hosting parity can be claimed.

## Step 1 — Compatibility

Run:

```bash
pnpm cloudflare:check
```

This runs Cloudflare's current `vinext check` against the existing Next.js 16 application.

Do not run `vinext init` until the report is reviewed. The initializer is intentionally a second gate because it modifies build/configuration files.

## Step 2 — Required runtime variables

The Cloudflare preview will need its own environment/secrets. Reuse values only where sharing is explicitly intended.

Required application values:

```text
DATABASE_URL
DATABASE_URL_UNPOOLED
PAYLOAD_SECRET
CRON_SECRET
PREVIEW_SECRET
NEXT_PUBLIC_SERVER_URL
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
NEXT_PUBLIC_POSTHOG_HOST
```

For the preview:

```text
NEXT_PUBLIC_SERVER_URL=https://<worker-name>.<account>.workers.dev
```

Do not set `BLOB_READ_WRITE_TOKEN` on the Worker just to make the deployment pass. The Vercel Blob adapter is provider-specific and must not be treated as the permanent Cloudflare media strategy.

## Provider-specific audit

### Origin

Application code should prefer `NEXT_PUBLIC_SERVER_URL`.

`VERCEL_PROJECT_PRODUCTION_URL` remains a Vercel fallback, not the hosting contract.

### Database

Keep Neon PostgreSQL during the pilot.

Moving hosting does not require moving the database. A database migration to D1 would create a second migration problem and is outside this pilot unless Neon connectivity proves unsuitable.

### Media

Current production uses:

```text
@payloadcms/storage-vercel-blob
BLOB_READ_WRITE_TOKEN
```

Target Cloudflare media storage is R2.

Payload provides an R2 adapter for Workers. It should only be added after the application runtime itself passes compatibility checks.

### Image processing

Payload currently passes `sharp` and defines multiple generated image sizes.

This must be validated separately on Workers. If native Sharp processing is not suitable in the Worker runtime, the preferred Cloudflare shape is:

```text
original upload → R2 → Cloudflare image transformation
```

Do not silently remove existing image-size behavior without checking every frontend usage.

### Analytics

PostHog Cloud EU is independent of the hosting provider.

Vercel Analytics is non-critical and may remain Vercel-only during the pilot.

## Validation matrix

### Public site

- FR homepage
- EN homepage
- article routes
- article images
- archive
- search
- sitemap
- robots
- metadata / social cards
- redirects
- PostHog page and editorial events

### Payload

- admin login
- post list
- edit article
- FR/EN localization
- draft preview
- publish
- source relationships
- media list
- media upload only after R2 is configured

### APIs

- newsletter subscription
- Payload REST API
- Payload GraphQL if used
- editorial import/update endpoints
- cron/job authorization

## Performance gate

Record the same checks against Vercel and the Worker preview:

- first uncached document response
- cached/static asset response
- article response from Cameroon
- article response from Europe
- Payload admin login response
- CPU/runtime errors in Worker logs

Cloudflare Workers Free currently has finite request and CPU limits, so a successful build alone does not prove that the full CMS belongs on the Free tier.

## Cutover rule

Do not point `insight.trigenys.com` at Cloudflare until:

1. public rendering passes;
2. Payload admin passes;
3. a durable media path passes;
4. Neon reads and writes pass;
5. analytics passes;
6. runtime limits are understood;
7. rollback to Vercel has been documented.

If full Payload on Workers is not a good fit, the fallback architecture is valid:

```text
Public editorial frontend → Cloudflare
Payload CMS / APIs       → separate Node runtime
Database                 → Neon
Media                    → R2 or existing object storage
```

The pilot should choose based on measured reliability and cost, not on provider preference.
