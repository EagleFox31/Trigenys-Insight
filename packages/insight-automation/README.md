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
checks every five minutes, with possible GitHub scheduling delays. See the full
guide for permissions, native CMS scheduling and worker monitoring.
