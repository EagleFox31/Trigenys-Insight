import { oauthBackend } from '@/automation/oauth/store'
import { oauthFailure, privateHeaders, readForm, throttle } from '@/automation/oauth/http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const params = await readForm(request)
    const { oauth, store } = await oauthBackend()
    await throttle(store, request, 'revoke', 120)
    await oauth.revoke(params.get('token') ?? '', params.get('client_id') ?? '')
    return new Response(null, { status: 200, headers: privateHeaders })
  } catch (error) { return oauthFailure(error) }
}
