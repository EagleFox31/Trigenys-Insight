# Trigenys Insight publishing automation

## Surfaces

- REST: `POST https://insight.trigenys.com/api/editorial-os`
- Remote MCP: `POST https://insight.trigenys.com/api/mcp` (stateless Streamable HTTP, JSON responses)
- Local MCP: `pnpm mcp`, or the `trigenys-insight-mcp` executable in the packaged SDK
- TypeScript: `InsightClient` from `@trigenys/insight-automation`

The remote MCP supports OAuth with PKCE for ChatGPT, plus service Bearer credentials.
See [OAuth configuration](mcp-oauth.md) for discovery, scopes and consent.

## Authentication

Service clients on both HTTP endpoints require `Authorization: Bearer <publishing-token>`. Existing
Editorial OS credentials continue to work without configuration changes. To rotate
the credential, generate a long random secret and put only its SHA-256 hex digest
in the server variable `INSIGHT_PUBLISHING_TOKEN_SHA256`. Setting it replaces the
legacy credential, so update existing Editorial OS clients at the same time.

The existing authenticated Payload editorial session can also be used by the same-origin
browser workspace at `/editorial/automation`. Session calls require an authenticated
editor and an Origin matching `NEXT_PUBLIC_SERVER_URL`; missing or foreign origins
are rejected. The browser SDK uses `session: true`, keeps cookies same-origin and
contains no service token. This does not add new editor permissions.

Keep the original secret in your client secret manager as `INSIGHT_PUBLISHING_TOKEN`.
Never put it in Git, browser JavaScript, tool arguments or an article. This is a
trusted editorial service credential with access to drafts and publication; the
API is not a multi-tenant authorization layer. `ownerKey` and `target` are correlation
labels from the original contract, not authorization boundaries.

For browser MCP clients, allow explicit origins in `INSIGHT_MCP_ALLOWED_ORIGINS`
(comma-separated). Native clients can omit Origin. The MCP uses no sessions or SSE
streams: GET and DELETE return 405. Requests are limited to 4,400,000 bytes.

## Build and install the SDK

From the repository:

```bash
pnpm install --frozen-lockfile
pnpm automation:build
cd packages/insight-automation
npm pack
```

Install the resulting `trigenys-insight-automation-0.1.0.tgz` in another project:

```bash
npm install /path/to/trigenys-insight-automation-0.1.0.tgz
```

The package is ready to distribute as a tarball. It has not been published to npm.
The SDK requires Node.js 20+ (native fetch). It rejects public HTTP origins, embedded
credentials, redirects and base URLs containing a path. It never retries publication
automatically. Reuse the same key when retrying a request after a timeout.

## SDK workflow

```ts
import { InsightClient } from '@trigenys/insight-automation'

const insight = new InsightClient({
  baseURL: 'https://insight.trigenys.com',
  token: process.env.INSIGHT_PUBLISHING_TOKEN!,
})

const categories = await insight.listCategories('fr')
const authors = await insight.listAuthors()
// Choose the appropriate IDs from these results; do not blindly select the first.
const source = await insight.upsertSource({
  title: 'Primary research source',
  publisher: 'Publisher',
  url: 'https://example.com/research',
  accessedAt: new Date().toISOString(),
  language: 'en',
})

const photo = await insight.uploadMedia({
  filename: 'hero.webp',
  mimeType: 'image/webp',
  alt: 'Describe the actual image for readers using a screen reader.',
  dataBase64: imageBuffer.toString('base64'),
})

const article = {
  idempotencyKey: 'my-article-2026-10-14',
  ownerKey: 'trigenys',
  target: 'trigenys-insight',
  locale: 'fr' as const,
  title: 'Le titre de mon article',
  excerpt: 'Un résumé concret et utile.',
  authors: [chosenAuthorId],
  categories: [chosenCategoryId],
  sources: [source.id],
  heroImage: photo.id,
  body: '## Le premier constat\n\nLe texte et sa [source](https://example.com/research).\n\n[[CHART:round1]]\n\n[[IMAGE:detail]]',
  charts: [{
    marker: '[[CHART:round1]]',
    title: 'Round 1',
    description: 'Résumé accessible du constat illustré.',
    sourceLabel: 'Source et date des données',
    sourceUrl: 'https://example.com/research',
    metrics: [{
      label: 'Une mesure', unit: '%', precision: 1,
      points: [{ label: 'A', value: 20 }, { label: 'B', value: 35 }],
    }],
  }],
  images: [{ marker: '[[IMAGE:detail]]', media: photo.id }],
  metadata: { seo: { title: 'Titre SEO', description: 'Description SEO', image: photo.id } },
  keyTakeaways: [{ text: 'Un constat vérifiable.' }],
  faq: [{ question: 'Une vraie question ?', answer: 'Une réponse directe.' }],
}

const draft = await insight.createDraft(article)
console.log(draft.adminURL) // Review in the authenticated Payload editor.
const stored = await insight.getPost(article.idempotencyKey, 'fr')
// Only after editorial approval / an explicit request to publish:
const publication = await insight.publish(article)
console.log(publication.url)
```

Example values and identifiers must be replaced with actual researched content and
chosen IDs. No content from this guide is published automatically.

Supported body formatting is intentionally bounded: blank-line-separated paragraphs,
`##`–`####` headings, HTTPS Markdown links, bold and italics. Lists, fenced code,
HTML and arbitrary Lexical JSON are not parsed by this interface. Use Payload's editor
for other rich-text features. All chart/image markers must be unique and occupy their
own paragraph exactly once. Multiple charts (up to 20) and images (up to 30) are supported.

Images are supplied as bytes, not fetched from arbitrary URLs. PNG, JPEG and WebP
are verified with Sharp, limited to 3 MiB and 40 million pixels; animated images are
rejected. Sequential retries of the same bytes and alt text reuse the stored media.
Concurrent media uploads are not guaranteed to deduplicate. There is no remote-file
fetching or SVG/HTML upload route.

## Document identity and FR/EN

The same `idempotencyKey` produces the same database-unique slug as the original
Editorial OS endpoint (`editorial-os-<20-character hash>`). Keys must be globally
unique across your editorial producers. The slug remains stable across revisions
and translations. Human-readable slug overrides are not supported by this version.

Send FR and EN drafts with the same key and different `locale` values. Localized
fields are written in the requested locale; shared fields (hero, authors, categories,
publication status) belong to the same article. Prepare both translations before
publishing. An EN request is not automatically a translation of FR.

Omitted optional fields preserve their existing values on updates; arrays can be
cleared by sending `[]` where the schema allows it. Author/category fallback exists
for legacy text-only clients, but new clients should send chosen IDs explicitly.
Publication requests send the complete article, not just an ID. Draft replies have
`url: null`, `previewURL: null` and an authenticated `adminURL`: a public route is not
an authenticated draft preview. Publication triggers the existing cache and IndexNow hooks.

Sequential retries create or update one article. The database unique slug constraint
prevents concurrent first creates from creating duplicate posts; a losing request
returns `409 concurrent_write_retry` once the winning document is visible. Retry the
same request after it finishes. Concurrent edits are last-write-wins; serialize
revisions and translation writes in your orchestrator. This API has no revision lease.

## MCP configuration

Local source checkout (absolute path):

```json
{
  "mcpServers": {
    "trigenys-insight": {
      "command": "node",
      "args": ["/absolute/path/Trigenys-Insight/packages/insight-automation/dist/stdio.js"],
      "env": {
        "INSIGHT_BASE_URL": "https://insight.trigenys.com",
        "INSIGHT_PUBLISHING_TOKEN": "<inject-from-secret-manager>"
      }
    }
  }
}
```

Run `pnpm automation:build` before using this configuration. For a packaged install,
launch the installed `trigenys-insight-mcp` executable instead. The MCP stdout is
reserved for JSON-RPC; startup diagnostics use stderr.

For a remote MCP client, configure URL `https://insight.trigenys.com/api/mcp` with
header `Authorization: Bearer <publishing-token>`. Exact config keys depend on the
MCP host. Available tools:

- `insight_list_categories`
- `insight_list_authors`
- `insight_get_post`
- `insight_update_post`
- `insight_upsert_source`
- `insight_upload_media`
- `insight_create_draft`
- `insight_publish`
- `insight_schedule_post`
- `insight_cancel_schedule`
- `insight_list_schedules`

Draft and publish are separate tools, with mutation annotations. The publish tool
explicitly describes its public effect. Host approval policies still apply.

## Validation and errors

`pnpm test:unit` covers API/SDK round trips with an in-memory Payload fixture,
credential rejection, malformed and oversized input, reference validation, rich
content, image-byte validation, source upserts, SDK credential handling, MCP discovery
and calls, and stateless HTTP handshakes. `pnpm automation:build` verifies the standalone
package. These checks do not replace a production credential/Blob/DB smoke test.

Common HTTP codes: 400 invalid JSON/schema, 401 invalid token, 404 missing automation
post, 409 concurrent first-write conflict, 413 request/image too large, 422 bad image,
content markers or relationship IDs, 503 missing legacy author/category defaults.
Unexpected server errors are logged privately and returned as `publication_failed`.
No database schema migration is required.

## Updating an existing summary

`InsightClient.updatePost({ idempotencyKey, locale, excerpt, seoDescription, expectedUpdatedAt })`
and `insight_update_post` update only the supplied fields. They never create a post
and preserve content, media, relationships and publication status. The optional
`expectedUpdatedAt` rejects an already stale snapshot before writing; it is not an
atomic revision lease, so orchestrators should serialize concurrent edits. Empty
updates are rejected. The authenticated workspace `/editorial/automation` loads
the existing FR/EN summaries and submits targeted MCP updates, then reads them
back through the SDK to verify preservation of the rich content and cover.
# Articles liés (Related Posts)

`relatedPosts` est disponible dans `insight_create_draft`, `insight_publish` et `insight_update_post`, ainsi que dans les méthodes correspondantes du SDK. Il s'agit d'une liste ordonnée de 0 à 12 identifiants d'articles existants. Les doublons sont supprimés en conservant la première occurrence ; un article ne peut pas se référencer lui-même.

Omettre ce champ conserve la sélection actuelle. Envoyer `[]` vide la sélection. Les références peuvent viser des brouillons pour préparer une publication ; seuls les articles accessibles au lecteur peuvent être affichés sur le site public.

Exemple de modification ciblée :

```json
{"postId": 8, "locale": "fr", "relatedPosts": [14, 24], "expectedUpdatedAt": "<updatedAt obtenu par insight_get_post>"}
```

Cette modification utilise le droit OAuth `editorial:write` et conserve le contenu, l'image et le statut si ces champs sont omis. Les liens ne sont pas réciproques automatiquement : la sélection de A ne modifie pas celle de B. Le champ est partagé entre les versions linguistiques du même article.


## Scheduled publication

Payload's native post editor already exposes **Schedule publish**. Choose the date
and time there, or use the MCP tools `insight_schedule_post`,
`insight_cancel_schedule`, and `insight_list_schedules`.

The SDK provides the same operations:

```ts
await insight.schedulePost({
  postId: draft.id,
  publishAt: '2027-01-15T09:00:00+01:00',
  timeZone: 'Africa/Douala',
  expectedUpdatedAt: latest.post.updatedAt as string,
})
await insight.listSchedules({ postId: draft.id })
// Calling schedulePost again with another date replaces pending publication jobs.
await insight.cancelSchedule({ postId: draft.id })
```

`publishAt` must be a future ISO 8601 timestamp with an explicit UTC offset; it
identifies the instant. `timeZone` is a validated IANA zone used for the scheduling
response (default Africa/Douala). Stored/listed dates are UTC and must be converted
for display. List results support `page` and `limit` (max 100) and include failed
jobs, but exclude completed and cancelled jobs. They include schedules made in the
native CMS. Publish and cancel operations require both `editorial:write` and
`editorial:publish`; listing requires `editorial:read`.

Scheduling does not edit the article or publish immediately. It publishes the
**latest saved draft**, not a frozen snapshot. Publication status is shared across
FR/EN; prepare both translations first. Already public articles and empty content
are rejected by the MCP. Cancel before execution to keep the draft; once a job is
processing the MCP returns a conflict. Repeated identical scheduling calls reuse
the existing job. Replacements use a database transaction and the same advisory
lock as the worker. Native CMS changes use Payload's own queue controls.

### Worker and operations

`.github/workflows/publish-scheduled.yml` runs every five minutes, off the top of
the hour, and can also be run manually in GitHub Actions. It calls
`POST /api/editorial/scheduled-publish`. GitHub scheduling can be delayed or skipped
under load: this is a best-effort publication time, not a minute-accurate SLA.
Overdue jobs remain queued for the next run. GitHub may disable scheduled workflows
after prolonged repository inactivity; monitor workflow runs and re-enable if needed.

No long-lived publishing token is stored in the workflow. GitHub supplies a
short-lived OIDC identity. The server verifies the RS256 signature against GitHub's
fixed JWKS endpoint, expiry, audience, repository, main branch, exact workflow path
and permitted event. Forks, pull requests and other workflows are rejected. It
runs at most ten due `schedulePublish` jobs for **posts** per call, across queues;
it does not execute pages, globals, unpublication jobs or arbitrary tasks. Payload
handles due-date filtering, atomic job claiming, persistence and publication hooks
(cache refresh and sitemap updates). The endpoint returns processed/failed counts.

Inspect failed jobs via `listSchedules` or Payload Jobs. Fix the underlying article
or validation issue, then reprogram the draft to replace its failed job. Do not
reprogram an article that is already public. A busy queue returns HTTP 409 and the
workflow retries. A job already processing cannot be cancelled through the MCP.

## Inventory, full content edits and technical audits

The MCP exposes `insight_list_posts`, `insight_update_content` and
`insight_audit_posts`; the SDK provides `listPosts`, `updateContent` and `auditPosts`.

```ts
const drafts = await insight.listPosts({ status: 'DRAFT', heroImage: 'missing', locale: 'fr', page: 1, limit: 25 })
const latest = await insight.getPost({ postId: 42, locale: 'fr' })
await insight.updateContent({
  postId: 42, locale: 'fr', expectedUpdatedAt: latest.post.updatedAt as string,
  body: '## Un contenu corrigé\n\nLe nouveau corps complet de l’article.',
})
const audit = await insight.auditPosts({ status: 'DRAFT', page: 1, limit: 20 })
```

Inventory returns exact filtered `totalDocs`, summaries and pagination (maximum
100 per page). Filters include latest saved status, category, title search, cover
presence and publication date range. `status: DRAFT` can include a draft revision
of an already public article: `isPublic` separately reports its live status.
Localized fields never silently fall back to the other language.

Full content editing requires a fresh `expectedUpdatedAt` from `getPost` or
`listPosts`. It replaces the supplied language's body, preserves omitted metadata,
the slug, publication status, other-language body and pending schedules. Shared
fields such as categories and cover still apply across languages. Editing a
published version changes its public content immediately and requires both
`editorial:write` and `editorial:publish`; a latest draft revision stays a draft.
The scheduled worker publishes the latest saved version at execution time.

Existing embedded blocks must be retained explicitly using a standalone marker:
`body: 'Texte corrigé.\n\n[[BLOCK:diagram]]'` and
`retainedBlocks: [{ marker: '[[BLOCK:diagram]]', blockId: '<existing fields.id>' }]`.
This copies the existing CMS block, including interactive diagrams. To deliberately
remove or rebuild blocks, pass `allowBlockRemoval: true`; new charts and images
use the usual `charts` and `images` definitions and standalone markers. Arbitrary
Lexical JSON and status changes are rejected by this operation.

Inventory and audit require `editorial:read`. Audit checks both FR/EN without
fallback, explicit SEO fields, structured sources, cover and embedded media,
internal article links and basic structure. Select `checks` to restrict the checks
or `postIds` for particular articles. Maximum 50 articles per page; summaries and
issue counts cover only the returned page, so follow `hasNextPage` for a complete
audit. A technical pass is **not editorial approval**: there is no fact-checking,
translation-quality judgment or external URL/image availability check, and audit
never modifies or publishes anything. SEO lengths are indicative warnings.
