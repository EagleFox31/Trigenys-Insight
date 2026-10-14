import { oauthURLs, SCOPES } from '@/automation/oauth/core'
export const dynamic = 'force-dynamic'
export function GET() {
  const { origin, resource } = oauthURLs()
  return Response.json({ resource, authorization_servers: [origin], scopes_supported: SCOPES, bearer_methods_supported: ['header'] }, { headers: { 'Cache-Control': 'no-store' } })
}
