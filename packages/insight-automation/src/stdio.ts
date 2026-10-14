#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { InsightClient } from './index.ts'
import { createInsightMCPServer } from './mcp.ts'

const baseURL = process.env.INSIGHT_BASE_URL
const token = process.env.INSIGHT_PUBLISHING_TOKEN
if (!baseURL || !token) {
  console.error('Set INSIGHT_BASE_URL and INSIGHT_PUBLISHING_TOKEN before starting the MCP server.')
  process.exitCode = 1
} else {
  const client = new InsightClient({ baseURL, token })
  await createInsightMCPServer(client).connect(new StdioServerTransport())
}
