import {
  initTransaction,
  commitTransaction,
  killTransaction,
  type PayloadRequest,
} from 'payload'
import { editorialRubrics } from '@/editorial/rubrics'
import type {
  CategoryCreateInput,
  CategoryRenameInput,
  CategoryWriteResult,
} from '../../packages/insight-automation/src/schema'
import { EditorialError } from './errors'

// Serialize writes on one category. Updates in the Payload transaction are
// atomic across both locales, while the advisory lock protects the stale check.
async function withCategoryLock<T>(req: PayloadRequest, id: number, fn: () => Promise<T>): Promise<T> {
  const connection = await req.payload.db.pool.connect()
  let locked = false
  try {
    const result = await connection.query('SELECT pg_try_advisory_lock(946324, $1) AS locked', [id])
    locked = result.rows[0]?.locked === true
    if (!locked) throw new EditorialError(409, 'category_edit_busy_retry')
    return await fn()
  } finally {
    if (locked) await connection.query('SELECT pg_advisory_unlock(946324, $1)', [id])
    connection.release()
  }
}

async function findCategory(req: PayloadRequest, where: { slug: { equals: string } } | { id: { equals: number } }, locale: 'fr' | 'en') {
  const result = await req.payload.find({
    collection: 'categories',
    where,
    locale,
    fallbackLocale: false,
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return result.docs[0] ?? null
}

export async function createCategory(req: PayloadRequest, input: CategoryCreateInput): Promise<CategoryWriteResult> {
  const target = { slug: { equals: input.slug } }
  const existing = await findCategory(req, target, 'fr')
  if (existing) {
    const english = await findCategory(req, { id: { equals: existing.id } }, 'en')
    // Retrying an identical creation is a read-only, idempotent no-op.
    if (existing.title === input.titleFr && english?.title === input.titleEn &&
        (input.color === undefined || existing.color?.toLowerCase() === input.color.toLowerCase()))
      return {
        ok: true, id: existing.id, slug: existing.slug,
        titleFr: existing.title, titleEn: english.title,
        updatedAt: existing.updatedAt, changed: false, created: false,
      }
    throw new EditorialError(409, 'category_slug_already_exists')
  }
  // Canonical rubrics have independently reviewed labels and URLs in code.
  if (editorialRubrics.some((rubric) => rubric.id === input.slug ||
        rubric.paths.fr === input.slug || rubric.paths.en === input.slug))
    throw new EditorialError(409, 'canonical_rubric_requires_editorial_setup')

  const owns = await initTransaction(req)
  try {
    // The slug must never be generated from a localized title automatically.
    const french = await req.payload.create({
      collection: 'categories',
      data: {
        slug: input.slug,
        generateSlug: false,
        title: input.titleFr,
        ...(input.color ? { color: input.color } : {}),
      },
      locale: 'fr',
      depth: 0,
      overrideAccess: true,
      req,
    })
    const english = await req.payload.update({
      collection: 'categories',
      id: french.id,
      data: { title: input.titleEn, slug: input.slug, generateSlug: false },
      locale: 'en',
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (english.slug !== input.slug)
      throw new EditorialError(409, 'category_slug_changed_unexpectedly')
    if (owns) await commitTransaction(req)
    return {
      ok: true, id: french.id, slug: input.slug,
      titleFr: input.titleFr, titleEn: input.titleEn,
      updatedAt: english.updatedAt, changed: true, created: true,
    }
  } catch (error) {
    if (owns) await killTransaction(req)
    throw error
  }
}

export async function renameCategory(req: PayloadRequest, input: CategoryRenameInput): Promise<CategoryWriteResult> {
  return withCategoryLock(req, input.categoryId, async () => {
    const lookup = { id: { equals: input.categoryId } }
    const [french, english] = await Promise.all([
      findCategory(req, lookup, 'fr'),
      findCategory(req, lookup, 'en'),
    ])
    if (!french) throw new EditorialError(404, 'category_not_found')
    if (editorialRubrics.some((rubric) => rubric.id === french.slug))
      throw new EditorialError(409, 'canonical_rubric_titles_defined_in_code')
    const unchanged = french.title === input.titleFr && english?.title === input.titleEn
    if (unchanged)
      return {
        ok: true, id: french.id, slug: french.slug,
        titleFr: input.titleFr, titleEn: input.titleEn,
        updatedAt: french.updatedAt, changed: false, created: false,
      }
    if (Date.parse(french.updatedAt) !== Date.parse(input.expectedUpdatedAt))
      throw new EditorialError(409, 'stale_category_edit')

    const owns = await initTransaction(req)
    try {
      const updatedFr = await req.payload.update({
        collection: 'categories',
        id: french.id,
        locale: 'fr',
        depth: 0,
        data: { title: input.titleFr, slug: french.slug, generateSlug: false },
        overrideAccess: true,
        req,
      })
      const updatedEn = await req.payload.update({
        collection: 'categories',
        id: french.id,
        locale: 'en',
        depth: 0,
        data: { title: input.titleEn, slug: french.slug, generateSlug: false },
        overrideAccess: true,
        req,
      })
      if (updatedFr.slug !== french.slug || updatedEn.slug !== french.slug)
        throw new EditorialError(409, 'category_slug_changed_unexpectedly')
      if (owns) await commitTransaction(req)
      return {
        ok: true, id: french.id, slug: french.slug,
        titleFr: input.titleFr, titleEn: input.titleEn,
        updatedAt: updatedEn.updatedAt, changed: true, created: false,
      }
    } catch (error) {
      if (owns) await killTransaction(req)
      throw error
    }
  })
}
