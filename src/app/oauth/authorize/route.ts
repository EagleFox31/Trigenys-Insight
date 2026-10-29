import { oauthBackend } from '@/automation/oauth/store'
import { OAuthError, oauthURLs } from '@/automation/oauth/core'
import { consentPageHeaders, escapeHTML, oauthFailure, privateHeaders, readForm, requireOrigin, throttle } from '@/automation/oauth/http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const names: Record<string, string> = { 'editorial:read': 'Lire les articles, brouillons, auteurs et rubriques', 'editorial:write': 'Créer et modifier les articles, médias et sources', 'editorial:publish': 'Publier des articles et modifier leur statut' }

export async function GET(request: Request) {
  try {
    const { oauth, payload, store } = await oauthBackend()
    await throttle(store, request, 'authorize', 30)
    const url = new URL(request.url)
    await oauth.authorization(url.searchParams)
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      const destination = `/oauth/authorize${url.search}`
      return new Response(null, { status: 303, headers: { ...privateHeaders, Location: `${oauthURLs().origin}/login?redirect=${encodeURIComponent(destination)}` } })
    }
    const consent = await oauth.consent(url.searchParams, user.id)
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Autoriser ${escapeHTML(consent.name)} | Trigenys Insight</title><style>body{margin:0;background:#f7f7f3;color:#102f52;font:16px system-ui;line-height:1.6}main{max-width:620px;margin:8vh auto;padding:32px;background:white;border:1px solid #dfded7;border-radius:16px}small{letter-spacing:.12em}h1{font-size:32px;line-height:1.2}li{margin:12px 0}button{padding:14px 20px;border:1px solid #102f52;border-radius:8px;font:inherit;cursor:pointer;margin:8px 8px 0 0}button[value=allow]{background:#102f52;color:white}.muted{color:#59636b}</style></head><body><main><small>TRIGENYS INSIGHT · CONNEXION MCP</small><h1>Autoriser ${escapeHTML(consent.name)} ?</h1><p>Cette connexion permettra à ${escapeHTML(consent.name)} d’utiliser ton espace éditorial avec les droits suivants :</p><ul>${consent.scopes.map((scope) => `<li>${escapeHTML(names[scope])}</li>`).join('')}</ul><p class="muted">Tu es connecté à ton compte Trigenys Insight. Ton mot de passe reste chez Trigenys. Tu peux révoquer cette connexion depuis l’espace éditorial.</p><p class="muted">Retour sécurisé vers ${escapeHTML(new URL(consent.redirect).hostname)}.</p><form method="post" action="/oauth/authorize"><input type="hidden" name="request" value="${escapeHTML(consent.nonce)}"><button name="decision" value="allow">Autoriser la connexion</button><button name="decision" value="deny">Refuser</button></form></main></body></html>`
    return new Response(html, { headers: consentPageHeaders })
  } catch (error) { return oauthFailure(error) }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request)
    const form = await readForm(request)
    if (form.getAll('request').length !== 1 || form.getAll('decision').length !== 1 || !['allow', 'deny'].includes(form.get('decision') ?? '')) throw new OAuthError('invalid_request')
    const { oauth, payload } = await oauthBackend()
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) throw new OAuthError('access_denied', 401)
    const destination = await oauth.approve(form.get('request')!, user.id, form.get('decision') === 'allow')
    return new Response(null, { status: 303, headers: { ...privateHeaders, Location: destination } })
  } catch (error) { return oauthFailure(error) }
}
