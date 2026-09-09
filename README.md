# Trigenys Insights

Independent research and analysis on technology, cybersecurity, business and digital systems — built from Douala for Africa and beyond.

## Stack

- Next.js 16 App Router and React 19
- Payload CMS 3
- PostgreSQL 16
- TypeScript and Tailwind CSS 4
- Vitest and Playwright

Payload lives inside the Next.js application: the public publication is served at `/`, the editorial workspace at `/admin`, and the REST and GraphQL APIs under `/api`.

## Editorial model

- `posts`: localized articles with drafts, scheduled publishing, SEO, reading time, featured state and traceable sources
- `categories`: localized editorial pillars and visual accents
- `research-sources`: private source registry used by the newsroom
- `reports`: free or premium research reports with methodology and source links
- `newsletter-subscribers`: consent records created only through the public subscription endpoint
- `media`, `users`, `pages`: assets, editorial accounts and evergreen pages

Business scoring and research computation do not live in browser components. When that layer becomes necessary, it should be implemented as a server-side research service and persist reproducible results for Payload to publish.

## Local setup

Requirements: Node.js 20+, pnpm 9+ and PostgreSQL 16 (or Docker).

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm dev
```

Open `http://localhost:3000/admin`, create the first administrator, then use the dashboard seed action on a new database.

## Quality checks

```bash
pnpm lint
pnpm test:int
pnpm test:e2e
pnpm build
```

## Production

Set `DATABASE_URL`, `PAYLOAD_SECRET`, `CRON_SECRET`, `PREVIEW_SECRET` and `NEXT_PUBLIC_SERVER_URL`. Create and commit a database migration before the first production release:

```bash
pnpm payload migrate:create
pnpm payload migrate
pnpm build
pnpm start
```

Never point local schema push at a production database.

## Origin

The visual language and initial editorial backlog were migrated from the original Figma Make React/Vite mockup stored in the Trigenys project archive. The public brand remains **TRIGENYS INSIGHTS**; the GitHub repository keeps the historical singular name `Trigenys-Insight`.
