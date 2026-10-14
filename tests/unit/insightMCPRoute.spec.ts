// @vitest-environment node
import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({
    auth: async () => ({ user: { id: 1 } }),
    find: async () => ({ docs: [{ id: 1, name: 'Author', email: 'private@example.com' }] }),
    logger: { error: vi.fn() },
  })),
  createLocalReq: vi.fn(async (_options, payload) => ({ payload })),
}))
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
    expect((await POST(request({}, { Authorization: 'Bearer wrong' }))).status).toBe(401)
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
    expect((await tools.json()).result.tools).toHaveLength(7)
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
    expect((await response.json()).result.tools).toHaveLength(7)
    expect(
      (await POST(request(body, { ...headers, Origin: 'https://foreign.example' }))).status,
    ).toBe(401)
  })
  it('rejects unsupported GET and DELETE transports', async () => {
    expect((await GET()).status).toBe(405)
    expect((await DELETE()).status).toBe(405)
  })
})
