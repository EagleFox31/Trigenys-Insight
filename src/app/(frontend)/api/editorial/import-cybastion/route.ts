import { importCybastionArticle } from '@/endpoints/importCybastionArticle'
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
    const result = await importCybastionArticle({ payload, req })

    return Response.json({
      success: true,
      created: result.created,
      id: result.id,
      slug: result.slug,
      title: result.title,
      editUrl: '/admin/collections/posts/' + result.id,
      message: result.created
        ? "Article importé en brouillon. Tu peux maintenant ajouter l'image de couverture, relire et publier."
        : "Cet article existe déjà dans le CMS. J'ai ouvert sa fiche plutôt que de l'écraser.",
    })
  } catch (error) {
    payload.logger.error({ err: error, message: 'Cybastion editorial import failed' })

    return Response.json(
      {
        success: false,
        message: "L'import a échoué. Aucun article existant n'a été écrasé.",
      },
      { status: 500 },
    )
  }
}
