import { importEditorialLaunchPack } from '@/endpoints/importEditorialLaunchPack'
import { geminiArgonArticle } from '@/editorial/gemini-4-argon-rounds-2026'
import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

export const maxDuration = 60

// One authenticated, idempotent editorial import; never publishes posts.
export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    return Response.json({ success: false, message: "Connecte-toi à Payload pour importer le brouillon." }, { status: 403 })
  }
  try {
    const req = await createLocalReq({ user }, payload)
    const results = await importEditorialLaunchPack({
      payload, req, onlySlugs: [geminiArgonArticle.slug],
    })
    const created = results.filter(item => item.created).length
    const translated = results.filter(item => item.englishCreated).length
    return Response.json({
      success: true,
      results: results.map(item => ({ ...item, editUrl: '/admin/collections/posts/' + item.id })),
      message: created
        ? "Le brouillon FR/EN et ses quatre graphiques sont importés. Vérifie la mise en page, les sources et le hero avant publication."
        : translated
          ? "Traduction EN ajoutée au brouillon existant, sans écraser le contenu français."
          : "L'article existe déjà. Aucun contenu existant n'a été modifié.",
    })
  } catch (error) {
    payload.logger.error({ err: error, message: 'Gemini Argon editorial import failed' })
    return Response.json({
      success: false,
      message: "Import interrompu. Vérifie Posts avant de relancer pour éviter les doublons.",
    }, { status: 500 })
  }
}
