import { importEditorialLaunchPack } from '@/endpoints/importEditorialLaunchPack'
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
    const results = await importEditorialLaunchPack({ payload, req })

    const createdCount = results.filter((item) => item.created).length
    const englishCreatedCount = results.filter((item) => item.englishCreated).length

    return Response.json({
      success: true,
      results: results.map((item) => ({
        ...item,
        editUrl: '/admin/collections/posts/' + item.id,
      })),
      message:
        createdCount > 0
          ? `${createdCount} article(s) créé(s) en brouillon. Les versions anglaises manquantes ont aussi été ajoutées. Ajoute les images de couverture, relis les deux locales puis publie.`
          : englishCreatedCount > 0
            ? `Les articles existaient déjà. ${englishCreatedCount} version(s) anglaise(s) manquante(s) ont été ajoutée(s) sans écraser les versions françaises.`
            : "Les trois articles existent déjà en français et en anglais. Aucun contenu éditorial n'a été écrasé.",
    })
  } catch (error) {
    payload.logger.error({ err: error, message: 'Editorial launch pack import failed' })

    return Response.json(
      {
        success: false,
        message: "L'import du pack éditorial a échoué. Aucun article existant n'a été écrasé.",
      },
      { status: 500 },
    )
  }
}
