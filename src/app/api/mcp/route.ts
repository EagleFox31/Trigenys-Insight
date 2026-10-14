import { createLocalReq, getPayload } from 'payload'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import config from '@payload-config'
import { createInsightMCPServer } from '../../../../packages/insight-automation/src/mcp'
import { operationSchema } from '../../../../packages/insight-automation/src/schema'
import { authorizedEditorialRequest } from '@/automation/auth'
import { EditorialError, executeEditorialOperation } from '@/automation/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request): Promise<Response> {
  if (!authorizedEditorialRequest(request.headers.get('authorization'))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  // Bearer clients can omit Origin. Browser requests must be same-origin or explicitly allowed.
  const origin = request.headers.get('origin')
  const allowed = [
    new URL(request.url).origin,
    ...(process.env.INSIGHT_MCP_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  ]
  if (origin && !allowed.includes(origin))
    return Response.json({ error: 'invalid_origin' }, { status: 403 })
  const server = createInsightMCPServer({
    request: async (input) => {
      const payload = await getPayload({ config })
      const req = await createLocalReq({}, payload)
      try {
        return await executeEditorialOperation(req, operationSchema.parse(input))
      } catch (error) {
        if (error instanceof EditorialError) throw new Error(error.code)
        payload.logger.error({ err: error }, 'MCP editorial operation failed')
        throw new Error('publication_failed')
      }
    },
  })
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: 4400000,
  })
  await server.connect(transport)
  try {
    return await transport.handleRequest(request)
  } finally {
    await server.close()
  }
}

// Stateless JSON mode does not keep sessions or SSE streams.
export async function GET() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } })
}
export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } })
}
