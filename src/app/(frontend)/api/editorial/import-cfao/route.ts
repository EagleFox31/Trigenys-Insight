import { importEditorialLaunchPack } from '@/endpoints/importEditorialLaunchPack'
import { cfaoArticle } from '@/editorial/cfao-mobility-cameroon'
import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

export const maxDuration = 60

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return Response.json({ success: false, message: 'Connecte-toi à Payload.' }, { status: 403 })
  try {
    const req = await createLocalReq({ user }, payload)
    const [result] = await importEditorialLaunchPack({ payload, req, onlySlug: cfaoArticle.slug })
    return Response.json({ success: true, editUrl: `/admin/collections/posts/${result.id}`, message: result.created ? 'Article CFAO créé en brouillon FR/EN avec graphique interactif. Relis et publie.' : 'Article déjà présent : le brouillon existant a été conservé.' })
  } catch (error) {
    payload.logger.error({ err: error, message: 'CFAO editorial import failed' })
    return Response.json({ success: false, message: 'L’import CFAO a échoué.' }, { status: 500 })
  }
}
