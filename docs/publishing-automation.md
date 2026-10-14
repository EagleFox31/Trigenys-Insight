# Trigenys Insight publishing automation

## Surfaces

- REST: `POST https://insight.trigenys.com/api/editorial-os`
- Remote MCP: `POST https://insight.trigenys.com/api/mcp` (stateless Streamable HTTP, JSON responses)
- Local MCP: `pnpm mcp`, or the `trigenys-insight-mcp` executable in the packaged SDK
- TypeScript: `InsightClient` from `@trigenys/insight-automation`

The remote endpoint supports MCP clients that can supply an Authorization header.
It does not implement OAuth discovery or an OAuth login flow. A client that requires
OAuth needs a separate authentication integration; do not assume the endpoint can
be connected to ChatGPT simply by pasting its URL.

## Authentication

Both HTTP endpoints require `Authorization: Bearer <publishing-token>`. Existing
Editorial OS credentials continue to work without configuration changes. To rotate
the credential, generate a long random secret and put only its SHA-256 hex digest
in the server variable `INSIGHT_PUBLISHING_TOKEN_SHA256`. Setting it replaces the
legacy credential, so update existing Editorial OS clients at the same time.

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
- `insight_upsert_source`
- `insight_upload_media`
- `insight_create_draft`
- `insight_publish`

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
