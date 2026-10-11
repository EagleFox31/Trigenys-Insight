import { importEditorialLaunchPack } from '@/endpoints/importEditorialLaunchPack'
import { october11EditorialArticles } from '@/editorial/october-11-2026'
import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

export const maxDuration = 60

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    return Response.json({ success: false, message: "Connecte-toi à Payload pour importer ces brouillons." }, { status: 403 })
  }
  try {
    const req = await createLocalReq({ user }, payload)
    const results = await importEditorialLaunchPack({
      payload, req, onlySlugs: october11EditorialArticles.map(article => article.slug),
    })
    const created = results.filter(item => item.created).length
    const translated = results.filter(item => item.englishCreated).length
    return Response.json({
      success: true,
      results: results.map(item => ({ ...item, editUrl: '/admin/collections/posts/' + item.id })),
      message: created > 0
        ? `${created} article(s) créé(s) en brouillon ; vérifier liens, traductions, graphiques et images avant publication.`
        : translated > 0
          ? `${translated} traduction(s) anglaise(s) manquante(s) ajoutée(s), sans écraser les articles français.`
          : "Les quatre articles existent déjà. Aucun texte existant n'a été écrasé.",
    })
  } catch (error) {
    payload.logger.error({ err: error, message: 'Oct 11 editorial import failed' })
    return Response.json({
      success: false,
      message: "Import interrompu. Certains brouillons peuvent avoir été créés : consulte Posts avant de relancer.",
    }, { status: 500 })
  }
}
