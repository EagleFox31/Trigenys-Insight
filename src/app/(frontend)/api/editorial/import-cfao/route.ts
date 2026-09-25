import { importEditorialLaunchPack } from '@/endpoints/importEditorialLaunchPack'
import { cfaoArticle } from '@/editorial/cfao-mobility-cameroon'
import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

export const maxDuration = 60

export async function GET(): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return Response.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_SERVER_URL || 'https://insight.trigenys.com'))

  return new Response(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Importer l’article CFAO · Trigenys Insights</title>
<style>body{font:16px system-ui,sans-serif;max-width:640px;margin:12vh auto;padding:0 24px;color:#192e48;line-height:1.6}button{background:#192e48;color:white;border:0;border-radius:6px;padding:14px 20px;font:inherit;cursor:pointer}a{color:#b95c12}</style></head>
<body><h1>Importer l’article CFAO</h1><p>Cette action crée un brouillon en français et en anglais avec son graphique interactif. Si le brouillon existe déjà, il sera conservé.</p><form method="post"><button type="submit">Importer et ouvrir le brouillon</button></form><p><a href="/admin">Retour à Payload</a></p></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return Response.json({ success: false, message: 'Connecte-toi à Payload.' }, { status: 403 })
  try {
    const req = await createLocalReq({ user }, payload)
    const [result] = await importEditorialLaunchPack({ payload, req, onlySlug: cfaoArticle.slug })
    const editUrl = `/admin/collections/posts/${result.id}`
    if ((await headers()).get('accept')?.includes('text/html')) {
      return Response.redirect(new URL(editUrl, process.env.NEXT_PUBLIC_SERVER_URL || 'https://insight.trigenys.com'), 303)
    }
    return Response.json({ success: true, editUrl, message: result.created ? 'Article CFAO créé en brouillon FR/EN avec graphique interactif. Relis et publie.' : 'Article déjà présent : le brouillon existant a été conservé.' })
  } catch (error) {
    payload.logger.error({ err: error, message: 'CFAO editorial import failed' })
    return Response.json({ success: false, message: 'L’import CFAO a échoué.' }, { status: 500 })
  }
}
