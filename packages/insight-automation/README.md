# @trigenys/insight-automation

TypeScript SDK and MCP server for the Trigenys Insight publishing API.

```ts
import { InsightClient } from '@trigenys/insight-automation'

const insight = new InsightClient({
  baseURL: 'https://insight.trigenys.com',
  token: process.env.INSIGHT_PUBLISHING_TOKEN!,
})
const categories = await insight.listCategories('fr')
const authors = await insight.listAuthors()
```

Methods: `updatePost`, `createDraft`, `publish`, `uploadMedia`, `upsertSource`, `getPost`,
`listCategories`, `listAuthors`, `schedulePost`, `cancelSchedule`, `listSchedules`. Input schemas and types are exported. Publishing
requires a complete article; reuse its idempotency key across retries and FR/EN
translations. The token is a trusted server credential, never a browser secret.

Start the local MCP with `trigenys-insight-mcp`, setting `INSIGHT_BASE_URL` and
`INSIGHT_PUBLISHING_TOKEN` in its environment. For custom transports, import
`createInsightMCPServer` from `@trigenys/insight-automation/mcp` and pass an
`InsightClient` or another compatible backend. A Bearer-authenticated stateless
Streamable HTTP server is also available at `/api/mcp` on the CMS, with OAuth/PKCE for ChatGPT.

[Full setup and publishing guide](https://github.com/EagleFox31/Trigenys-Insight/blob/main/docs/publishing-automation.md)

Node.js 20+ is required. Build with `npm run build`; distribute with `npm pack`.
The package is not yet published on npm.


Schedule an existing draft with an explicit UTC offset and IANA zone:

```ts
await insight.schedulePost({ postId: 42, publishAt: '2027-01-15T09:00:00+01:00', timeZone: 'Africa/Douala' })
await insight.listSchedules({ postId: 42 })
await insight.cancelSchedule({ postId: 42 })
```

The matching MCP tools are `insight_schedule_post`, `insight_list_schedules` and
`insight_cancel_schedule`. Repeating the same instant is idempotent; a new date
replaces pending publication jobs. The latest saved draft is published. The worker
is woken by Cloudflare at the deadline, with hourly recovery and possible infrastructure delays. See the full
guide for permissions, native CMS scheduling and worker monitoring.

Editorial management: `listPosts({ status: 'DRAFT', heroImage: 'missing' })` returns
paginated summaries and exact filtered counts; `auditPosts()` checks both languages
and technical issues without changing content. Follow pagination to cover all
articles. An automated pass is not editorial approval or fact verification.
`updateContent({ postId, expectedUpdatedAt, body })` replaces a language's full body
while keeping status and schedules. Preserve existing embedded blocks with
`retainedBlocks`, or explicitly allow their removal with `allowBlockRemoval: true`.
Published edits take effect immediately. See the full guide for filters, scopes
and preservation details. The matching MCP tools are `insight_list_posts`,
`insight_update_content` and `insight_audit_posts`.

### Buffer social distribution

The server can use `BUFFER_API_KEY` to prepare public articles as LinkedIn/Facebook
Buffer drafts. `bufferStatus()` lists actual connected channels;
`bufferCreateDraft({ postId, locale, channelId, idempotencyKey, text?, socialMediaId? })` enqueues a
safe draft request. Verify the remote receipt with `bufferListPosts({ postId })`
after background delivery completes. Scheduling requires explicit approval and
`bufferSchedulePost({ exportId, expectedUpdatedAt, publishAt })`; cancellation uses
`bufferCancelSchedule({ exportId, expectedUpdatedAt })`. Buffer credentials stay
on the server. See [the distribution guide](../../docs/buffer-distribution.md).

`bufferUpdateDraft({ exportId, expectedUpdatedAt, postId, locale, text, socialMediaId? })`
edits the same confirmed remote draft, including image-only changes. An explicit
socialMediaId selects a reviewed 1080×1350 CMS banner for that article, locale and
channel; omission preserves the prior selection. A public image, alt text and
supported MIME type are validated. It never changes heroImage, schedules or
publishes. Definitive failed creations can be retried on the same export with a
reviewed banner; unknown outcomes and external text/media changes require review.
Scheduling requires a reviewed social banner and actual Buffer media confirmation.
Read selected socialAsset, actual bufferAssets and safe typed lastFailure details
through bufferListPosts.
