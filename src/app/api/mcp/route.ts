import { createLocalReq, getPayload } from 'payload'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import config from '@payload-config'
import { createInsightMCPServer, InsightAuthorizationError } from '../../../../packages/insight-automation/src/mcp'
import { operationSchema } from '../../../../packages/insight-automation/src/schema'
import { authorizedEditorialRequest, authorizedEditorialSession } from '@/automation/auth'
import { EditorialError, executeEditorialOperation } from '@/automation/service'
import { challenge, oauthURLs, operationScopes } from '@/automation/oauth/core'
import { oauthBackend } from '@/automation/oauth/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request): Promise<Response> {
  let principal: { userId: number; scopes: string[] } | null = null
  if (!authorizedEditorialRequest(request.headers.get('authorization'))) {
    const bearer = request.headers.get('authorization')?.match(/^Bearer (ins_oauth_[A-Za-z0-9_-]{43})$/)?.[1]
    if (bearer) {
      try {
        const { oauth } = await oauthBackend()
        principal = await oauth.verify(bearer)
      } catch {
        return Response.json({ error: 'authentication_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
      }
      if (!principal) return unauthorized()
    } else {
      if (!request.headers.get('cookie') || !request.headers.get('origin')) return unauthorized()
      const payload = await getPayload({ config })
      const { user } = await payload.auth({ headers: request.headers })
      if (!authorizedEditorialSession({ headers: request.headers, user })) return unauthorized()
    }
  }
  // Bearer clients can omit Origin. Browser requests must be same-origin or explicitly allowed.
  const origin = request.headers.get('origin')
  const allowed = [
    oauthURLs().origin,
    ...(process.env.INSIGHT_MCP_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  ]
  if (origin && !allowed.includes(origin))
    return Response.json({ error: 'invalid_origin' }, { status: 403 })
  const server = createInsightMCPServer({
    request: async (input) => {
      const parsed = operationSchema.parse(input)
      if (principal && operationScopes(parsed).some((scope) => !principal.scopes.includes(scope)))
        throw new InsightAuthorizationError(challenge('insufficient_scope'))
      const payload = await getPayload({ config })
      const user = principal ? await payload.findByID({ collection: 'users', id: principal.userId, depth: 0, overrideAccess: true }) : undefined
      const req = await createLocalReq(user ? { user } : {}, payload)
      try {
        return await executeEditorialOperation(req, parsed)
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
function unauthorized() {
  return Response.json({ error: 'unauthorized' }, { status: 401, headers: { 'WWW-Authenticate': challenge(), 'Cache-Control': 'no-store' } })
}
export async function GET() { return unauthorized() }
export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } })
}
