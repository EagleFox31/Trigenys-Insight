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
`listCategories`, `listAuthors`. Input schemas and types are exported. Publishing
requires a complete article; reuse its idempotency key across retries and FR/EN
translations. The token is a trusted server credential, never a browser secret.

Start the local MCP with `trigenys-insight-mcp`, setting `INSIGHT_BASE_URL` and
`INSIGHT_PUBLISHING_TOKEN` in its environment. For custom transports, import
`createInsightMCPServer` from `@trigenys/insight-automation/mcp` and pass an
`InsightClient` or another compatible backend. A Bearer-authenticated stateless
Streamable HTTP server is also available at `/api/mcp` on the CMS; OAuth is not included.

[Full setup and publishing guide](https://github.com/EagleFox31/Trigenys-Insight/blob/main/docs/publishing-automation.md)

Node.js 20+ is required. Build with `npm run build`; distribute with `npm pack`.
The package is not yet published on npm.
