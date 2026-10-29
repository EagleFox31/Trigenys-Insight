// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const { backend } = vi.hoisted(() => ({ backend: {
  payload: { auth: vi.fn(async () => ({ user: { id: 1 } })) },
  store: { rateLimit: vi.fn(async () => true) },
  oauth: {
    authorization: vi.fn(async () => ({})),
    consent: vi.fn(async () => ({ name: 'ChatGPT', nonce: 'one-use-user-bound-consent', scopes: ['editorial:read'], redirect: 'https://chatgpt.com/connector_platform_oauth_redirect' })),
    approve: vi.fn(async () => 'https://chatgpt.com/connector_platform_oauth_redirect?code=test-code&state=original-state&iss=https%3A%2F%2Finsight.example'),
  },
} }))
vi.mock('@/automation/oauth/store', () => ({ oauthBackend: async () => backend }))
import { GET, POST } from '@/app/oauth/authorize/route'

beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://insight.example') })
afterEach(() => vi.unstubAllEnvs())

describe('OAuth consent document and native form submission', () => {
  it('preserves same-origin form Origin and permits the validated ChatGPT callback redirect', async () => {
    const page = await GET(new Request('https://insight.example/oauth/authorize?client_id=test'))
    expect(page.status).toBe(200)
    // Fetch Standard: no-referrer serializes Origin as null for native form
    // navigation; same-origin keeps it on this POST and strips it cross-origin.
    expect(page.headers.get('Referrer-Policy')).toBe('same-origin')
    expect(page.headers.get('Content-Security-Policy')).toContain("form-action 'self' https://chatgpt.com https://claude.ai;")
    const document = await page.text()
    const nonce = document.match(/name="request" value="([^"]+)"/)![1]
    const result = await POST(new Request('https://insight.example/oauth/authorize', {
      method: 'POST', headers: { Origin: 'https://insight.example', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ request: nonce, decision: 'allow' }),
    }))
    expect(result.status).toBe(303)
    expect(backend.oauth.approve).toHaveBeenCalledWith(nonce, 1, true)
    const callback = new URL(result.headers.get('Location')!)
    expect(callback.origin).toBe('https://chatgpt.com')
    expect(callback.searchParams.get('state')).toBe('original-state')
    expect(callback.searchParams.get('iss')).toBe('https://insight.example')
  })
  it('displays the actual MCP client name instead of hard-coding ChatGPT', async () => {
    backend.oauth.consent.mockResolvedValueOnce({
      name: 'Claude', nonce: 'claude-consent-nonce', scopes: ['editorial:read'],
      redirect: 'https://claude.ai/api/mcp/auth_callback',
    })
    const page = await GET(new Request('https://insight.example/oauth/authorize?client_id=claude'))
    const html = await page.text()
    expect(html).toContain('<title>Autoriser Claude | Trigenys Insight</title>')
    expect(html).toContain('Cette connexion permettra à Claude')
    expect(html).toContain('Retour sécurisé vers claude.ai')
    expect(html).not.toContain('Cette connexion permettra à ChatGPT')
  })
  it('continues rejecting null and foreign origins before granting any access', async () => {
    for (const origin of ['null', 'https://evil.example']) {
      const result = await POST(new Request('https://insight.example/oauth/authorize', {
        method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ request: 'nonce', decision: 'allow' }),
      }))
      expect(result.status).toBe(403)
    }
    expect(backend.oauth.approve).not.toHaveBeenCalled()
  })
})
