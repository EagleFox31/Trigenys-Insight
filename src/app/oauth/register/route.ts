import { oauthBackend } from '@/automation/oauth/store'
import { limitedBody, oauthFailure, privateHeaders, throttle } from '@/automation/oauth/http'
import { OAuthError } from '@/automation/oauth/core'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new OAuthError('invalid_request')
    let body: unknown
    try { body = JSON.parse(await limitedBody(request)) } catch (error) { if (error instanceof OAuthError) throw error; throw new OAuthError('invalid_request') }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new OAuthError('invalid_request')
    const { oauth, store } = await oauthBackend()
    await throttle(store, request, 'register', 20)
    return Response.json(await oauth.register(body as Record<string, unknown>), { status: 201, headers: privateHeaders })
  } catch (error) { return oauthFailure(error) }
}
