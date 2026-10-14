import { oauthBackend } from '@/automation/oauth/store'
import { oauthFailure, privateHeaders, readForm, throttle } from '@/automation/oauth/http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const params = await readForm(request)
    const { oauth, store } = await oauthBackend()
    await throttle(store, request, 'token', 120)
    return Response.json(await oauth.exchange(params), { headers: privateHeaders })
  } catch (error) { return oauthFailure(error) }
}
