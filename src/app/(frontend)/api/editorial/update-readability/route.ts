import { updateExistingArticlesForReadability } from '@/endpoints/updateExistingArticlesForReadability'
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
    const results = await updateExistingArticlesForReadability({ payload, req })

    const updated = results.filter((item) => item.status === 'updated')
    const unchanged = results.filter((item) => item.status === 'unchanged')
    const missing = results.filter((item) => item.status === 'missing')

    return Response.json({
      success: true,
      results: results.map((item) => ({
        ...item,
        editUrl: item.id ? '/admin/collections/posts/' + item.id : undefined,
      })),
      message:
        updated.length > 0
          ? `${updated.length} article(s) mis à jour. Seules les locales dont le contenu avait réellement changé ont été réécrites. ${unchanged.length} article(s) étaient déjà à jour${missing.length ? ` ; ${missing.length} article(s) cible(s) n'existent pas encore dans le CMS` : ''}.`
          : missing.length > 0
            ? `Aucune mise à jour nécessaire. ${missing.length} article(s) cible(s) n'existent pas encore dans le CMS.`
            : 'Tous les articles ciblés utilisent déjà la dernière révision éditoriale.',
    })
  } catch (error) {
    payload.logger.error({ err: error, message: 'Editorial readability update failed' })

    return Response.json(
      {
        success: false,
        message:
          "La mise à jour éditoriale a échoué. Les versions Payload permettent de revenir à l'état précédent si une locale avait déjà été enregistrée.",
      },
      { status: 500 },
    )
  }
}
