// @vitest-environment node
import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const { verifyOAuth } = vi.hoisted(() => ({ verifyOAuth: vi.fn(async (): Promise<{ userId: number; scopes: string[] } | null> => ({ userId: 1, scopes: ['editorial:read'] })) }))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({
    auth: async () => ({ user: { id: 1 } }),
    findByID: async () => ({ id: 1, name: 'Editor' }),
    find: async () => ({ docs: [{ id: 1, name: 'Author', email: 'private@example.com' }] }),
    logger: { error: vi.fn() },
  })),
  createLocalReq: vi.fn(async (_options, payload) => ({ payload })),
}))
vi.mock('@/automation/oauth/store', () => ({ oauthBackend: vi.fn(async () => ({ oauth: { verify: verifyOAuth } })) }))
import { getPayload } from 'payload'
import { POST, GET, DELETE } from '@/app/api/mcp/route'

const token = 'route-test-token'
function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://insight.example/api/mcp', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-11-25',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://insight.example')
  vi.stubEnv('INSIGHT_PUBLISHING_TOKEN_SHA256', createHash('sha256').update(token).digest('hex'))
})
afterEach(() => vi.unstubAllEnvs())

describe('hosted MCP route', () => {
  it('blocks invalid credentials and foreign browser origins before opening Payload', async () => {
    const denied = await POST(request({}, { Authorization: 'Bearer wrong' }))
    expect(denied.status).toBe(401)
    expect(denied.headers.get('WWW-Authenticate')).toContain('oauth-protected-resource/api/mcp')
    expect((await POST(request({}, { Origin: 'https://untrusted.example' }))).status).toBe(403)
    expect(getPayload).not.toHaveBeenCalled()
  })
  it('initializes and discovers tools without a database connection', async () => {
    const response = await POST(
      request({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'test', version: '1' },
        },
      }),
    )
    expect(response.status).toBe(200)
    expect((await response.json()).result.serverInfo.name).toBe('trigenys-insight')
    const tools = await POST(request({ jsonrpc: '2.0', id: 2, method: 'tools/list' }))
    const listed = (await tools.json()).result.tools
    expect(listed).toHaveLength(14)
    expect(listed.find((tool: { name: string }) => tool.name === 'insight_publish')._meta.securitySchemes).toEqual([{ type: 'oauth2', scopes: ['editorial:write', 'editorial:publish'] }])
    expect(getPayload).not.toHaveBeenCalled()
  })
  it('calls a tool on a fresh HTTP request and keeps private author fields out of the result', async () => {
    const response = await POST(
      request({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'insight_list_authors', arguments: {} },
      }),
    )
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.result.structuredContent.docs).toEqual([{ id: 1, name: 'Author' }])
    expect(getPayload).toHaveBeenCalledTimes(1)
  })
  it('accepts the existing editorial session only from the canonical origin', async () => {
    const body = { jsonrpc: '2.0', id: 4, method: 'tools/list' }
    const headers = {
      Authorization: '',
      Origin: 'https://insight.example',
      Cookie: 'payload-token=test-session-fixture',
    }
    const response = await POST(request(body, headers))
    expect(response.status).toBe(200)
    expect((await response.json()).result.tools).toHaveLength(14)
    expect(
      (await POST(request(body, { ...headers, Origin: 'https://foreign.example' }))).status,
    ).toBe(401)
  })
  it('accepts OAuth read access and returns an auth challenge before a write can reach the database', async () => {
    const headers = { Authorization: `Bearer ins_oauth_${'a'.repeat(43)}` }
    const authors = await POST(request({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'insight_list_authors', arguments: {} } }, headers))
    expect((await authors.json()).result.structuredContent.docs).toEqual([{ id: 1, name: 'Author' }])
    vi.clearAllMocks()
    const response = await POST(request({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'insight_update_post', arguments: { postId: 8, categories: [11] } } }, headers))
    const body = await response.json()
    expect(body.result.isError).toBe(true)
    expect(body.result._meta['mcp/www_authenticate'][0]).toContain('insufficient_scope')
    expect(getPayload).not.toHaveBeenCalled()
  })
  it('rejects unsupported GET and DELETE transports', async () => {
    expect((await GET()).status).toBe(401)
    expect((await DELETE()).status).toBe(405)
  })
  it('rejects expired OAuth tokens and fails closed when authentication storage is unavailable', async () => {
    const headers = { Authorization: `Bearer ins_oauth_${'a'.repeat(43)}` }
    verifyOAuth.mockResolvedValueOnce(null)
    expect((await POST(request({}, headers))).status).toBe(401)
    verifyOAuth.mockRejectedValueOnce(new Error('Database unavailable'))
    expect((await POST(request({}, headers))).status).toBe(503)
    expect(getPayload).not.toHaveBeenCalled()
  })
})
