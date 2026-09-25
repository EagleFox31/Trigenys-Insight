import { importEditorialLaunchPack } from '@/endpoints/importEditorialLaunchPack'
import { whispArticle } from '@/editorial/whisp'
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
    const [result] = await importEditorialLaunchPack({ payload, req, onlySlug: whispArticle.slug })
    return Response.json({
      success: true,
      editUrl: `/admin/collections/posts/${result.id}`,
      message: result.created
        ? 'Article Whisp créé en brouillon FR et EN, avec sources et SEO. Ajoute une image, relis et publie.'
        : result.englishCreated
          ? 'La traduction anglaise a été ajoutée au brouillon existant.'
          : 'Le lien whisp.cm est présent dans les deux versions. Les autres retouches du brouillon sont conservées.',
    })
  } catch (error) {
    payload.logger.error({ err: error, message: 'Whisp editorial import failed' })
    return Response.json({ success: false, message: 'L’import a échoué.' }, { status: 500 })
  }
}
