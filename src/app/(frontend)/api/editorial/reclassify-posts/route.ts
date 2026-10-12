import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

import { classifyExistingPost, curatedPostRubrics } from '@/editorial/postReclassification'

type RequestBody = {
  action?: 'preview' | 'apply'
  approvals?: { id: number; revision: string }[]
}

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return Response.json({ error: 'Connexion Payload requise.' }, { status: 403 })

  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return Response.json({ error: 'Requête JSON invalide.' }, { status: 400 })
  }
  if (body.action !== 'preview' && body.action !== 'apply') {
    return Response.json({ error: 'Action invalide.' }, { status: 400 })
  }
  const req = await createLocalReq({ user }, payload)

  try {
    const categories = await payload.find({
      collection: 'categories',
      req,
      overrideAccess: false,
      locale: 'fr',
      fallbackLocale: false,
      depth: 0,
      limit: 100,
      pagination: false,
    })
    const categoriesBySlug = new Map(categories.docs.map((cat) => [
      cat.slug,
      { id: cat.id, slug: cat.slug },
    ]))

    const result = await payload.find({
      collection: 'posts',
      req,
      overrideAccess: false,
      locale: 'fr',
      fallbackLocale: false,
      draft: false,
      depth: 1,
      limit: 200,
      pagination: false,
      sort: 'id',
    })

    const rows = result.docs.map((post) => {
      const current = (post.categories || [])
        .filter((cat) => typeof cat === 'object' && cat !== null && typeof cat.slug === 'string')
        .map((cat) => ({ id: cat.id, slug: cat.slug }))
      const planned = classifyExistingPost(post.slug, current, categoriesBySlug)
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        revision: post.updatedAt,
        published: post._status === 'published',
        previous: current.map((cat) => cat.slug),
        status: planned.status,
        target: 'rubric' in planned ? planned.rubric.id : null,
        categories: 'categories' in planned ? planned.categories : null,
      }
    })

    if (body.action === 'preview') {
      return Response.json({
        rows,
        counts: {
          changes: rows.filter((row) => row.status === 'change').length,
          unchanged: rows.filter((row) => row.status === 'unchanged').length,
          unlisted: rows.filter((row) => row.status === 'unlisted').length,
          missing: rows.filter((row) => row.status === 'missing-category').length,
        },
        message: 'Aperçu uniquement : aucun article modifié.',
      })
    }

    const approvals = body.approvals
    if (!Array.isArray(approvals) || approvals.length === 0 || approvals.length > 200) {
      return Response.json({ error: 'Prévisualise d’abord les articles.' }, { status: 400 })
    }
    if (new Set(approvals.map((item) => item.id)).size !== approvals.length ||
        approvals.some((item) => !Number.isInteger(item.id) || typeof item.revision !== 'string')) {
      return Response.json({ error: 'Sélection invalide.' }, { status: 400 })
    }

    const approved = new Map(approvals.map((item) => [item.id, item.revision]))
    const results: { id: number; slug: string; result: string }[] = []
    for (const row of rows) {
      if (!approved.has(row.id)) continue
      if (!(row.slug in curatedPostRubrics) || row.revision !== approved.get(row.id)) {
        results.push({ id: row.id, slug: row.slug, result: 'skipped-revision-or-unlisted' })
        continue
      }
      if (row.status !== 'change' || !row.categories) {
        results.push({ id: row.id, slug: row.slug, result: row.status })
        continue
      }

      // Check again immediately before writing: editors might be working while
      // the batch is running. Only the category relationship is updated.
      const latest = await payload.findByID({
        collection: 'posts',
        id: row.id,
        req,
        overrideAccess: false,
        locale: 'fr',
        fallbackLocale: false,
        depth: 1,
        draft: false,
      })
      if (latest.slug !== row.slug || latest.updatedAt !== row.revision) {
        results.push({ id: row.id, slug: row.slug, result: 'skipped-concurrent-edit' })
        continue
      }

      await payload.update({
        collection: 'posts',
        id: row.id,
        req,
        overrideAccess: false,
        locale: 'fr',
        fallbackLocale: false,
        draft: false,
        depth: 0,
        data: { categories: row.categories },
        context: { disableIndexNow: true },
      })
      results.push({ id: row.id, slug: row.slug, result: 'updated' })
    }

    return Response.json({
      results,
      message: `${results.filter((item) => item.result === 'updated').length} articles reclassés. Les anciennes catégories et les statuts de publication sont conservés.`,
    })
  } catch (error) {
    payload.logger.error({ err: error, message: 'Curated editorial category migration failed' })
    return Response.json({ error: 'Reclassement interrompu. Réessaie l’aperçu.' }, { status: 500 })
  }
}
