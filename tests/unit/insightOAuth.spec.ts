// @vitest-environment node
import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InsightOAuth, digest, operationScopes, oauthURLs, type OAuthRecord, type OAuthStore } from '@/automation/oauth/core'
import { readForm, requireOrigin } from '@/automation/oauth/http'

class MemoryStore implements OAuthStore {
  rows = new Map<string, OAuthRecord>()
  async get(key: string) { return this.rows.get(key) ?? null }
  async put(value: OAuthRecord) { this.rows.set(value.key, structuredClone(value)) }
  async consumeAndPut(key: string, values: OAuthRecord[]) {
    const row = this.rows.get(key)
    if (!row || row.used || row.expiresAt.getTime() <= Date.now()) return false
    row.used = true
    for (const value of values) await this.put(value)
    return true
  }
  async revokeFamily(key: string) { const row = this.rows.get(key); if (row) row.data.revoked = true }
  async rateLimit() { return true }
}
const callback = 'https://chatgpt.com/connector_platform_oauth_redirect'
const claudeCallback = 'https://claude.ai/api/mcp/auth_callback'
const verifier = 'a'.repeat(64)
const pkce = createHash('sha256').update(verifier).digest('base64url')
async function setup(scope = 'editorial:read editorial:write editorial:publish') {
  const store = new MemoryStore()
  const userExists = vi.fn(async () => true)
  const oauth = new InsightOAuth(store, userExists)
  const client = await oauth.register({ redirect_uris: [callback], client_name: 'ChatGPT', token_endpoint_auth_method: 'none' })
  const request = new URLSearchParams({ client_id: client.client_id, redirect_uri: callback, response_type: 'code', resource: oauthURLs().resource, code_challenge: pkce, code_challenge_method: 'S256', state: 'original-state', scope })
  const consent = await oauth.consent(request, 1)
  const destination = new URL(await oauth.approve(consent.nonce, 1, true))
  const tokenRequest = new URLSearchParams({ client_id: client.client_id, redirect_uri: callback, grant_type: 'authorization_code', resource: oauthURLs().resource, code: destination.searchParams.get('code')!, code_verifier: verifier })
  return { store, oauth, client, request, consent, destination, tokenRequest, userExists }
}
beforeEach(() => vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://insight.example'))
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe('MCP OAuth authorization-code flow', () => {
  it('binds issuer, resource, user, redirect, state and PKCE to a single-use code', async () => {
    const s = await setup()
    expect(s.destination.searchParams.get('state')).toBe('original-state')
    expect(s.destination.searchParams.get('iss')).toBe('https://insight.example')
    const tokens = await s.oauth.exchange(s.tokenRequest)
    expect(await s.oauth.verify(tokens.access_token)).toEqual({ userId: 1, scopes: ['editorial:read', 'editorial:write', 'editorial:publish'] })
    expect(tokens).toMatchObject({ token_type: 'Bearer', expires_in: 3600 })
    expect(JSON.stringify([...s.store.rows])).not.toContain(tokens.access_token)
    expect(JSON.stringify([...s.store.rows])).not.toContain(tokens.refresh_token)
    await expect(s.oauth.exchange(s.tokenRequest)).rejects.toMatchObject({ code: 'invalid_grant' })
    await expect(s.oauth.approve(s.consent.nonce, 1, true)).rejects.toMatchObject({ code: 'invalid_request' })
  })
  it('accepts Claude exact callback with user consent, PKCE and one-time token exchange', async () => {
    const store = new MemoryStore()
    const oauth = new InsightOAuth(store, async () => true)
    const client = await oauth.register({ redirect_uris: [claudeCallback], client_name: 'Claude', token_endpoint_auth_method: 'none' })
    const request = new URLSearchParams({
      client_id: client.client_id, redirect_uri: claudeCallback, response_type: 'code',
      resource: oauthURLs().resource, code_challenge: pkce, code_challenge_method: 'S256',
      state: 'claude-state', scope: 'editorial:read',
    })
    const consent = await oauth.consent(request, 1)
    const destination = new URL(await oauth.approve(consent.nonce, 1, true))
    expect(destination.origin + destination.pathname).toBe(claudeCallback)
    expect(destination.searchParams.get('state')).toBe('claude-state')
    const tokenRequest = new URLSearchParams({
      client_id: client.client_id, redirect_uri: claudeCallback, grant_type: 'authorization_code',
      resource: oauthURLs().resource, code: destination.searchParams.get('code')!, code_verifier: verifier,
    })
    const tokens = await oauth.exchange(tokenRequest)
    expect(await oauth.verify(tokens.access_token)).toEqual({ userId: 1, scopes: ['editorial:read'] })
    await expect(oauth.exchange(tokenRequest)).rejects.toMatchObject({ code: 'invalid_grant' })
  })
  it('rejects unregistered and off-domain redirects without creating a grant', async () => {
    const { oauth, request } = await setup()
    for (const uri of ['https://evil.example/callback', 'https://chatgpt.com.evil.example/connector_platform_oauth_redirect', 'https://chatgpt.com/connector/oauth/id?next=evil', 'http://chatgpt.com/connector_platform_oauth_redirect', 'https://chatgpt.com/other', 'https://claude.ai.evil.example/api/mcp/auth_callback', 'http://claude.ai/api/mcp/auth_callback', 'https://claude.ai/api/mcp/auth_callback?next=evil', 'https://claude.ai/api/mcp/auth_callback/', 'https://claude.ai/other']) {
      await expect(oauth.register({ redirect_uris: [uri] })).rejects.toMatchObject({ code: 'invalid_redirect_uri' })
    }
    request.set('redirect_uri', 'https://chatgpt.com/connector/oauth/different')
    await expect(oauth.authorization(request)).rejects.toMatchObject({ code: 'invalid_redirect_uri' })
  })
  it('rejects wrong PKCE, resource, client and callback without consuming the valid code', async () => {
    const { oauth, tokenRequest } = await setup()
    for (const [key, value, code] of [['code_verifier', 'b'.repeat(64), 'invalid_grant'], ['resource', 'https://other.example/api/mcp', 'invalid_target'], ['client_id', 'missing', 'invalid_client'], ['redirect_uri', 'https://chatgpt.com/connector/oauth/other', 'invalid_grant']]) {
      const invalid = new URLSearchParams(tokenRequest)
      invalid.set(key, value)
      await expect(oauth.exchange(invalid)).rejects.toMatchObject({ code })
    }
    expect((await oauth.exchange(tokenRequest)).access_token).toMatch(/^ins_oauth_/)
  })
  it('requires S256, known scopes and a single value per security parameter', async () => {
    const { oauth, request } = await setup()
    request.set('code_challenge_method', 'plain')
    await expect(oauth.authorization(request)).rejects.toMatchObject({ code: 'invalid_request' })
    request.set('code_challenge_method', 'S256')
    request.set('scope', 'admin')
    await expect(oauth.authorization(request)).rejects.toMatchObject({ code: 'invalid_scope' })
    request.set('scope', 'editorial:read')
    request.append('resource', oauthURLs().resource)
    await expect(oauth.authorization(request)).rejects.toMatchObject({ code: 'invalid_request' })
  })
  it('ties consent to the authenticated user and returns issuer and state on refusal', async () => {
    const { oauth, request } = await setup()
    const pending = await oauth.consent(request, 1)
    await expect(oauth.approve(pending.nonce, 2, true)).rejects.toMatchObject({ code: 'invalid_request' })
    const denied = new URL(await oauth.approve(pending.nonce, 1, false))
    expect(denied.searchParams.get('error')).toBe('access_denied')
    expect(denied.searchParams.get('iss')).toBe(oauthURLs().origin)
    expect(denied.searchParams.get('state')).toBe('original-state')
    expect(denied.searchParams.has('code')).toBe(false)
  })
  it('expires codes and access tokens, while refreshing with rotation', async () => {
    const s = await setup('editorial:read')
    const tokens = await s.oauth.exchange(s.tokenRequest)
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 3601 * 1000)
    expect(await s.oauth.verify(tokens.access_token)).toBeNull()
    const refresh = new URLSearchParams({ grant_type: 'refresh_token', client_id: s.client.client_id, resource: oauthURLs().resource, refresh_token: tokens.refresh_token })
    const renewed = await s.oauth.exchange(refresh)
    expect(await s.oauth.verify(renewed.access_token)).toMatchObject({ scopes: ['editorial:read'] })
    await expect(s.oauth.exchange(refresh)).rejects.toMatchObject({ code: 'invalid_grant' })
    expect(await s.oauth.verify(renewed.access_token)).toBeNull()
  })
  it('rejects an expired authorization code', async () => {
    const s = await setup()
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 301 * 1000)
    await expect(s.oauth.exchange(s.tokenRequest)).rejects.toMatchObject({ code: 'invalid_grant' })
  })
  it('blocks scope escalation on refresh and revokes an entire token family', async () => {
    const s = await setup('editorial:read')
    const tokens = await s.oauth.exchange(s.tokenRequest)
    const refresh = new URLSearchParams({ grant_type: 'refresh_token', client_id: s.client.client_id, resource: oauthURLs().resource, refresh_token: tokens.refresh_token, scope: 'editorial:publish' })
    await expect(s.oauth.exchange(refresh)).rejects.toMatchObject({ code: 'invalid_scope' })
    await s.oauth.revoke(tokens.access_token, s.client.client_id)
    expect(await s.oauth.verify(tokens.access_token)).toBeNull()
    refresh.delete('scope')
    await expect(s.oauth.exchange(refresh)).rejects.toMatchObject({ code: 'invalid_grant' })
  })
  it('rejects deleted users and tokens minted for a different resource', async () => {
    const s = await setup()
    const tokens = await s.oauth.exchange(s.tokenRequest)
    s.userExists.mockResolvedValue(false)
    expect(await s.oauth.verify(tokens.access_token)).toBeNull()
    s.userExists.mockResolvedValue(true)
    const row = s.store.rows.get(`access:${digest(tokens.access_token)}`)!
    row.data.resource = 'https://another.example'
    expect(await s.oauth.verify(tokens.access_token)).toBeNull()
  })
  it('allows only one concurrent redemption of the same code', async () => {
    const { oauth, tokenRequest } = await setup()
    const results = await Promise.allSettled([oauth.exchange(tokenRequest), oauth.exchange(tokenRequest)])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  })
  it('does not grant write or publishing permissions with read-only access', () => {
    expect(operationScopes({ operation: 'get-post' })).toEqual(['editorial:read'])
    expect(operationScopes({ operation: 'create-category' })).toEqual(['editorial:write'])
    expect(operationScopes({ operation: 'rename-category' })).toEqual(['editorial:write'])
    expect(operationScopes({ operation: 'apply-category-merge' })).toEqual(['editorial:write', 'editorial:publish'])
    expect(operationScopes({ operation: 'plan-category-retirement' })).toEqual(['editorial:read'])
    expect(operationScopes({ operation: 'retire-category' })).toEqual(['editorial:write', 'editorial:publish'])
    expect(operationScopes({ operation: 'restore-category' })).toEqual(['editorial:write', 'editorial:publish'])
    expect(operationScopes({ operation: 'update-post' })).toEqual(['editorial:write'])
    expect(operationScopes({ operation: 'update-post', status: 'PUBLISHED' })).toEqual(['editorial:write', 'editorial:publish'])
    expect(operationScopes({ operation: 'publish' })).toEqual(['editorial:write', 'editorial:publish'])
  })
  it('requires a canonical Origin on consent and rejects oversized request bodies', async () => {
    expect(() => requireOrigin(new Request('https://insight.example/oauth/authorize', { method: 'POST', headers: { Origin: 'https://evil.example' } }))).toThrow()
    expect(() => requireOrigin(new Request('https://insight.example/oauth/authorize', { method: 'POST', headers: { Origin: 'https://insight.example' } }))).not.toThrow()
    await expect(readForm(new Request('https://insight.example/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'a'.repeat(17000) }))).rejects.toMatchObject({ status: 413 })
  })
})
