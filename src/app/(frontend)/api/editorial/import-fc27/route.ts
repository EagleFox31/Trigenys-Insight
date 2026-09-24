import { importEditorialLaunchPack } from '@/endpoints/importEditorialLaunchPack'
import { fc27Article } from '@/editorial/fc27'
import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

export const maxDuration = 60

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    return Response.json({ success: false, message: 'Connecte-toi à Payload.' }, { status: 403 })
  }

  try {
    const req = await createLocalReq({ user }, payload)
    const [result] = await importEditorialLaunchPack({ payload, req, onlySlug: fc27Article.slug })
    return Response.json({
      success: true,
      editUrl: `/admin/collections/posts/${result.id}`,
      message: result.created
        ? 'Brouillon FC 27 créé en français et en anglais. Relis et publie dans Payload.'
        : result.englishCreated
          ? 'Traduction anglaise ajoutée au brouillon existant.'
          : 'Le brouillon existe déjà dans les deux langues. Aucun contenu écrasé.',
    })
  } catch (error) {
    payload.logger.error({ err: error, message: 'FC 27 editorial import failed' })
    return Response.json({ success: false, message: "L’import a échoué." }, { status: 500 })
  }
}
