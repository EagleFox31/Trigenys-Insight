import { oauthBackend } from '@/automation/oauth/store'
import { OAuthError, oauthURLs } from '@/automation/oauth/core'
import { escapeHTML, oauthFailure, privateHeaders, readForm, requireOrigin } from '@/automation/oauth/http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const { payload } = await oauthBackend()
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) return Response.redirect(`${oauthURLs().origin}/login?redirect=/oauth/connections`, 303)
    const families = await payload.db.pool.query(`SELECT key, data, expires_at FROM insight_oauth_records WHERE kind = 'family' AND data->>'userId' = $1 AND data->>'revoked' = 'false' AND expires_at > NOW() ORDER BY created_at DESC`, [String(user.id)])
    const rows = families.rows.map((family) => `<li><strong>${escapeHTML(String(family.data.name || 'ChatGPT'))}</strong><p>${escapeHTML((family.data.scopes as string[]).join(', '))}</p><form method="post" action="/oauth/connections"><input type="hidden" name="family" value="${escapeHTML(family.key)}"><button>Révoquer cette connexion</button></form></li>`).join('')
    return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Connexions ChatGPT | Trigenys Insight</title><style>body{font:17px system-ui;color:#102f52;background:#f7f7f3;margin:8vh auto;max-width:700px;padding:24px}li{background:white;padding:24px;margin:16px 0;list-style:none;border:1px solid #dfded7;border-radius:12px}ul{padding:0}button{padding:12px 18px;cursor:pointer}</style></head><body><a href="/admin">← Espace éditorial</a><h1>Connexions ChatGPT</h1><p>Révoquer une connexion bloque immédiatement ses jetons d’accès et de renouvellement.</p><ul>${rows || '<li>Aucune connexion active.</li>'}</ul></body></html>`, { headers: { ...privateHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" } })
  } catch (error) { return oauthFailure(error) }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request)
    const form = await readForm(request)
    const { payload, store } = await oauthBackend()
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) throw new OAuthError('access_denied', 401)
    const family = await store.get(form.get('family') ?? '')
    if (!family || family.kind !== 'family' || family.data.userId !== user.id) throw new OAuthError('access_denied', 403)
    await store.revokeFamily(family.key)
    return new Response(null, { status: 303, headers: { ...privateHeaders, Location: '/oauth/connections' } })
  } catch (error) { return oauthFailure(error) }
}
