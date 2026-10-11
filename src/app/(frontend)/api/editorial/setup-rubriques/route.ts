import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

import { editorialRubrics } from '@/editorial/rubrics'

// Authenticated, idempotent opt-in. No mutation happens on a frontend GET/build.
// Keeps legacy CMS categories and existing article relationships intact.
export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    return Response.json({ success: false, message: 'Authentification Payload requise.' }, { status: 403 })
  }

  try {
    const req = await createLocalReq({ user }, payload)
    const results = []

    for (const rubric of editorialRubrics) {
      const existingResult = await payload.find({
        collection: 'categories',
        depth: 0,
        fallbackLocale: false,
        locale: 'fr',
        limit: 1,
        overrideAccess: false,
        req,
        where: { slug: { equals: rubric.id } },
      })
      const existing = existingResult.docs[0]

      if (existing) {
        results.push({ slug: rubric.id, id: existing.id, action: 'already-exists' })
        continue
      }

      const doc = await payload.create({
        collection: 'categories',
        locale: 'fr',
        depth: 0,
        overrideAccess: false,
        req,
        data: {
          slug: rubric.id,
          color: rubric.color,
          title: rubric.title.fr,
          manifesto: rubric.description.fr,
        },
      })

      await payload.update({
        collection: 'categories',
        id: doc.id,
        locale: 'en',
        fallbackLocale: false,
        depth: 0,
        overrideAccess: false,
        req,
        data: { title: rubric.title.en, manifesto: rubric.description.en },
      })

      results.push({ slug: rubric.id, id: doc.id, action: 'created' })
    }

    return Response.json({
      success: true,
      results,
      message: 'Les six rubriques FR/EN sont prêtes dans Payload. Aucun article existant n’a été modifié.',
    })
  } catch (error) {
    payload.logger.error({ err: error, message: 'Editorial rubric setup failed' })
    return Response.json({ success: false, message: 'Installation des rubriques impossible.' }, { status: 500 })
  }
}
