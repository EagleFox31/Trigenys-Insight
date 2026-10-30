import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const SCOPES = ['editorial:read', 'editorial:write', 'editorial:publish'] as const
export type OAuthRecord = { key: string; kind: string; data: Record<string, unknown>; expiresAt: Date; used: boolean }
export interface OAuthStore {
  get(key: string): Promise<OAuthRecord | null>
  put(record: OAuthRecord): Promise<void>
  consumeAndPut(key: string, records: OAuthRecord[]): Promise<boolean>
  revokeFamily(key: string): Promise<void>
  rateLimit(key: string, limit: number): Promise<boolean>
}
export class OAuthError extends Error {
  constructor(public code: string, public status = 400) { super(code) }
}
export const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const opaque = () => randomBytes(32).toString('base64url')
const record = (key: string, kind: string, data: Record<string, unknown>, seconds: number): OAuthRecord => ({ key, kind, data, expiresAt: new Date(Date.now() + seconds * 1000), used: false })
const usable = (value: OAuthRecord | null, kind: string): value is OAuthRecord => Boolean(value && value.kind === kind && value.expiresAt.getTime() > Date.now())
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export function oauthURLs() {
  const origin = new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'https://insight.trigenys.com').origin
  return { origin, resource: `${origin}/api/mcp`, metadata: `${origin}/.well-known/oauth-protected-resource/api/mcp` }
}
export function allowedRedirect(value: string): boolean {
  try {
    const url = new URL(value)
    const chatgpt = url.origin === 'https://chatgpt.com' &&
      (url.pathname === '/connector_platform_oauth_redirect' || /^\/connector\/oauth\/[A-Za-z0-9_-]+$/.test(url.pathname))
    const claude = url.origin === 'https://claude.ai' && url.pathname === '/api/mcp/auth_callback'
    return !url.username && !url.password && !url.search && !url.hash && (chatgpt || claude)
  } catch { return false }
}
export function parseScopes(value: unknown): string[] {
  const scopes = typeof value === 'string' && value.trim() ? [...new Set(value.trim().split(/\s+/))] : [...SCOPES]
  if (scopes.some((scope) => !(SCOPES as readonly string[]).includes(scope))) throw new OAuthError('invalid_scope')
  return scopes
}
export function operationScopes(input: { operation: string; status?: string }): string[] {
  if (['get-post', 'list-authors', 'list-categories', 'list-schedules', 'list-posts', 'audit-posts', 'buffer-status', 'buffer-list-posts', 'plan-slug-change', 'plan-category-merge', 'plan-category-retirement'].includes(input.operation)) return ['editorial:read']
  if (['publish', 'schedule-post', 'cancel-schedule', 'update-content', 'buffer-schedule-post', 'buffer-cancel-schedule', 'apply-slug-change', 'apply-category-merge', 'retire-category', 'restore-category'].includes(input.operation) || input.status === 'PUBLISHED') return ['editorial:write', 'editorial:publish']
  return ['editorial:write']
}
export function challenge(error = 'invalid_token') {
  return `Bearer resource_metadata="${oauthURLs().metadata}", scope="${SCOPES.join(' ')}", error="${error}", error_description="Connect your Trigenys Insight editorial account"`
}

export class InsightOAuth {
  constructor(private store: OAuthStore, private userExists: (id: number) => Promise<boolean>) {}

  async register(body: Record<string, unknown>) {
    if (!Array.isArray(body.redirect_uris) || body.redirect_uris.length < 1 || body.redirect_uris.length > 3 || body.redirect_uris.some((uri) => typeof uri !== 'string' || !allowedRedirect(uri))) throw new OAuthError('invalid_redirect_uri')
    if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== 'none') throw new OAuthError('invalid_client_metadata')
    if (body.grant_types && (!Array.isArray(body.grant_types) || body.grant_types.some((grant) => !['authorization_code', 'refresh_token'].includes(String(grant))))) throw new OAuthError('invalid_client_metadata')
    if (body.response_types && (!Array.isArray(body.response_types) || body.response_types.some((type) => type !== 'code'))) throw new OAuthError('invalid_client_metadata')
    const client_id = `insight_${opaque()}`
    const data = { client_id, client_name: typeof body.client_name === 'string' ? body.client_name.slice(0, 120) : 'Client MCP', redirect_uris: body.redirect_uris, token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }
    // Client registrations outlive rotating tokens; never expire an active MCP client.
    await this.store.put(record(`client:${client_id}`, 'client', data, 100 * 365 * 86400))
    return { ...data, client_id_issued_at: Math.floor(Date.now() / 1000) }
  }

  async authorization(params: URLSearchParams) {
    for (const key of ['client_id', 'redirect_uri', 'resource', 'scope', 'state', 'code_challenge', 'code_challenge_method', 'response_type']) if (params.getAll(key).length > 1) throw new OAuthError('invalid_request')
    const clientId = params.get('client_id') ?? ''
    const client = await this.store.get(`client:${clientId}`)
    const redirect = params.get('redirect_uri') ?? ''
    if (!usable(client, 'client')) throw new OAuthError('invalid_client')
    if (!allowedRedirect(redirect) || !(client.data.redirect_uris as string[]).includes(redirect)) throw new OAuthError('invalid_redirect_uri')
    if (params.get('response_type') !== 'code') throw new OAuthError('unsupported_response_type')
    if (params.get('resource') !== oauthURLs().resource) throw new OAuthError('invalid_target')
    if (params.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(params.get('code_challenge') ?? '')) throw new OAuthError('invalid_request')
    if ((params.get('state')?.length ?? 0) > 2048) throw new OAuthError('invalid_request')
    return { clientId, redirect, resource: oauthURLs().resource, issuer: oauthURLs().origin, scopes: parseScopes(params.get('scope')), state: params.get('state') ?? '', pkce: params.get('code_challenge')!, name: String(client.data.client_name) }
  }

  async consent(params: URLSearchParams, userId: number) {
    const request = await this.authorization(params)
    const nonce = opaque()
    await this.store.put(record(`consent:${digest(nonce)}`, 'consent', { ...request, userId }, 300))
    return { ...request, nonce }
  }

  async approve(nonce: string, userId: number, approve: boolean) {
    const key = `consent:${digest(nonce)}`
    const pending = await this.store.get(key)
    if (!usable(pending, 'consent') || pending.used || pending.data.userId !== userId) throw new OAuthError('invalid_request')
    const data = pending.data
    const url = new URL(String(data.redirect))
    url.searchParams.set('iss', oauthURLs().origin)
    if (data.state) url.searchParams.set('state', String(data.state))
    if (!approve) {
      if (!await this.store.consumeAndPut(key, [])) throw new OAuthError('invalid_request')
      url.searchParams.set('error', 'access_denied')
      return url.toString()
    }
    const code = opaque()
    if (!await this.store.consumeAndPut(key, [record(`code:${digest(code)}`, 'code', data, 300)])) throw new OAuthError('invalid_request')
    url.searchParams.set('code', code)
    return url.toString()
  }

  async exchange(params: URLSearchParams) {
    for (const key of ['grant_type', 'client_id', 'code', 'refresh_token', 'redirect_uri', 'code_verifier', 'resource', 'scope']) if (params.getAll(key).length > 1) throw new OAuthError('invalid_request')
    if (params.get('resource') !== oauthURLs().resource) throw new OAuthError('invalid_target')
    if (params.get('client_secret') || params.get('client_assertion')) throw new OAuthError('invalid_client')
    const clientId = params.get('client_id') ?? ''
    if (!usable(await this.store.get(`client:${clientId}`), 'client')) throw new OAuthError('invalid_client')
    const grant = params.get('grant_type')
    if (grant !== 'authorization_code' && grant !== 'refresh_token') throw new OAuthError('unsupported_grant_type')
    const kind = grant === 'authorization_code' ? 'code' : 'refresh'
    const key = `${kind}:${digest(params.get(kind === 'code' ? 'code' : 'refresh_token') ?? '')}`
    const stored = await this.store.get(key)
    if (!usable(stored, kind) || stored.data.clientId !== clientId || stored.data.resource !== oauthURLs().resource || stored.data.issuer !== oauthURLs().origin) throw new OAuthError('invalid_grant')
    if (stored.used) {
      if (kind === 'refresh') await this.store.revokeFamily(String(stored.data.family))
      throw new OAuthError('invalid_grant')
    }
    if (kind === 'code') {
      const verifier = params.get('code_verifier') ?? ''
      const proof = createHash('sha256').update(verifier).digest('base64url')
      if (params.get('redirect_uri') !== stored.data.redirect || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || !equal(proof, String(stored.data.pkce))) throw new OAuthError('invalid_grant')
    }
    const family = kind === 'code' ? `family:${opaque()}` : String(stored.data.family)
    if (kind === 'refresh') {
      const active = await this.store.get(family)
      if (!usable(active, 'family') || active.data.revoked) throw new OAuthError('invalid_grant')
    }
    if (!await this.userExists(Number(stored.data.userId))) throw new OAuthError('invalid_grant')
    const scopes = params.has('scope') ? parseScopes(params.get('scope')) : stored.data.scopes as string[]
    if (scopes.some((scope) => !(stored.data.scopes as string[]).includes(scope))) throw new OAuthError('invalid_scope')
    const access_token = `ins_oauth_${opaque()}`
    const refresh_token = `ins_refresh_${opaque()}`
    const data = { userId: stored.data.userId, clientId, scopes, resource: oauthURLs().resource, issuer: oauthURLs().origin, family }
    const records = [record(`access:${digest(access_token)}`, 'access', data, 3600), record(`refresh:${digest(refresh_token)}`, 'refresh', data, 30 * 86400)]
    if (kind === 'code') records.push(record(family, 'family', { ...data, name: stored.data.name, revoked: false }, 30 * 86400))
    if (!await this.store.consumeAndPut(key, records)) {
      if (kind === 'refresh') await this.store.revokeFamily(family)
      throw new OAuthError('invalid_grant')
    }
    return { access_token, token_type: 'Bearer', expires_in: 3600, refresh_token, scope: scopes.join(' ') }
  }

  async verify(token: string) {
    const stored = await this.store.get(`access:${digest(token)}`)
    if (!usable(stored, 'access') || stored.data.resource !== oauthURLs().resource || stored.data.issuer !== oauthURLs().origin) return null
    const family = await this.store.get(String(stored.data.family))
    if (!usable(family, 'family') || family.data.revoked || !await this.userExists(Number(stored.data.userId))) return null
    return { userId: Number(stored.data.userId), scopes: stored.data.scopes as string[] }
  }

  async revoke(token: string, clientId: string) {
    const kind = token.startsWith('ins_refresh_') ? 'refresh' : 'access'
    const found = await this.store.get(`${kind}:${digest(token)}`)
    if (found && found.data.clientId === clientId) await this.store.revokeFamily(String(found.data.family))
  }
}
