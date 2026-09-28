import { refreshSeptemberEditorialArticles } from '@/endpoints/refreshSeptemberEditorialArticles'
import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

export const maxDuration = 60

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return Response.json(
      { success: false, message: "Connecte-toi d'abord à l'administration Trigenys Insights." },
      { status: 403 },
    )
  }

  try {
    const req = await createLocalReq({ user }, payload)
    const results = await refreshSeptemberEditorialArticles({ payload, req })

    const updated = results.filter((item) => item.status === 'updated')
    const missing = results.filter((item) => item.status === 'missing')

    return Response.json({
      success: true,
      results: results.map((item) => ({
        ...item,
        editUrl: item.id ? '/admin/collections/posts/' + item.id : undefined,
      })),
      message:
        updated.length > 0
          ? `${updated.length} article(s) mis à jour avec la dernière version FR + EN. Images, statut de publication et champs non ciblés conservés.`
          : missing.length > 0
            ? `Aucun article modifié. ${missing.length} article(s) cible(s) n'existent pas encore dans Payload.`
            : 'Les trois articles utilisent déjà la dernière version éditoriale.',
    })
  } catch (error) {
    payload.logger.error({ err: error, message: 'September editorial refresh failed' })

    return Response.json(
      {
        success: false,
        message:
          "La mise à jour a échoué. Aucun import général n'est nécessaire ; Payload conserve également son historique de versions.",
      },
      { status: 500 },
    )
  }
}
