import { createHash } from 'node:crypto'
import { commitTransaction, initTransaction, killTransaction, type PayloadRequest } from 'payload'
import { editorialRubrics, sectionForCategorySlug } from '@/editorial/rubrics'
import type {
  CategoryRetireApplyInput,
  CategoryRetirePlanInput,
  CategoryRetirePlanResult,
  CategoryRestoreInput,
  CategoryRetirementResult,
} from '../../packages/insight-automation/src/schema'
import { EditorialError } from './errors'
import { withCategoryLock } from './categoryManagement'
import { withPublicationLock } from './scheduling'

// Version references MUST survive retirement. Check active relationships in
// both Payload snapshots and SQL relation tables: a draft-only query can miss
// still-published documents whose pending revision dropped an old category.
async function referenceCounts(req: PayloadRequest, categoryId: number) {
  const connection = await req.payload.db.pool.connect()
  try {
    const result = await connection.query(
      `SELECT
        (SELECT COUNT(DISTINCT parent_id) FROM posts_rels
          WHERE categories_id = $1 AND path = 'categories')::int AS active_posts,
        (SELECT COUNT(DISTINCT parent_id) FROM pages_rels
          WHERE categories_id = $1)::int AS active_pages,
        (SELECT COUNT(DISTINCT parent_id) FROM _posts_v_rels
          WHERE categories_id = $1 AND path = 'version.categories')::int AS historical_versions`,
      [categoryId],
    )
    const row = result.rows[0] ?? {}
    return {
      activePosts: Number(row.active_posts ?? 0),
      activePages: Number(row.active_pages ?? 0),
      historicalVersions: Number(row.historical_versions ?? 0),
    }
  } finally {
    connection.release()
  }
}

async function byId(req: PayloadRequest, id: number, locale: 'fr' | 'en' = 'fr') {
  const result = await req.payload.find({
    collection: 'categories',
    where: { id: { equals: id } },
    limit: 1,
    depth: 0,
    locale,
    fallbackLocale: false,
    overrideAccess: true,
    req,
  })
  return result.docs[0] ?? null
}

export async function planCategoryRetirement(
  req: PayloadRequest,
  input: CategoryRetirePlanInput,
): Promise<CategoryRetirePlanResult> {
  const category = await byId(req, input.categoryId, input.locale ?? 'fr')
  if (!category) throw new EditorialError(404, 'category_not_found')

  const rubric = sectionForCategorySlug(category.slug)
  const isLegacy = Boolean(rubric?.legacySlugs.some((slug) => slug === category.slug))
  const [latest, publicPosts, children, counts, targetResult] = await Promise.all([
    req.payload.find({
      collection: 'posts', where: { categories: { in: [category.id] } },
      draft: true, depth: 0, pagination: false, overrideAccess: true, req,
    }),
    req.payload.find({
      collection: 'posts', where: { categories: { in: [category.id] } },
      draft: false, depth: 0, pagination: false, overrideAccess: true, req,
    }),
    req.payload.find({
      collection: 'categories', where: { parent: { equals: category.id } },
      depth: 0, pagination: false, overrideAccess: true, req,
    }),
    referenceCounts(req, category.id),
    rubric ? req.payload.find({
      collection: 'categories',
      where: { slug: { equals: rubric.id } },
      limit: 1, depth: 0, overrideAccess: true, req,
    }) : Promise.resolve({ docs: [] }),
  ])
  const target = targetResult.docs[0] ?? null
  const activePostIds = [...new Set([
    ...latest.docs.map((post) => post.id),
    ...publicPosts.docs.map((post) => post.id),
  ])].sort((a, b) => a - b)
  const publishedPostIds = publicPosts.docs.filter((post) => post._status === 'published')
    .map((post) => post.id).sort((a, b) => a - b)
  const childCategoryIds = children.docs.map((child) => child.id).sort((a, b) => a - b)
  const retiredAt = category.retiredAt ?? null
  const reason = !isLegacy ? 'only_legacy_categories_can_be_retired'
    : retiredAt ? 'category_already_retired'
    : !target || target.retiredAt ? 'active_canonical_replacement_missing'
    : childCategoryIds.length ? 'category_has_children'
    : activePostIds.length || counts.activePosts ? 'category_still_used_by_posts'
    : counts.activePages ? 'category_still_used_by_pages'
    : null
  const replacement = target ? { id: target.id, slug: target.slug } : null
  const fingerprint = createHash('sha256').update(JSON.stringify({
    category: [category.id, category.slug, category.updatedAt, retiredAt],
    replacement: [target?.id ?? null, target?.updatedAt ?? null, target?.retiredAt ?? null],
    activePostIds,
    publishedPostIds,
    childCategoryIds,
    ...counts,
  })).digest('hex')
  return {
    ok: true, dryRun: true,
    category: {
      id: category.id, slug: category.slug, title: category.title,
      updatedAt: category.updatedAt, retiredAt,
    },
    replacement,
    activePostIds,
    publishedPostIds,
    childCategoryIds,
    pageReferenceCount: counts.activePages,
    historicalVersionCount: counts.historicalVersions,
    fingerprint,
    canRetire: reason === null,
    reason,
  }
}

export async function retireCategory(
  req: PayloadRequest,
  input: CategoryRetireApplyInput,
): Promise<CategoryRetirementResult> {
  return withPublicationLock(req, () => withCategoryLock(req, input.categoryId, async () => {
    const plan = await planCategoryRetirement(req, input)
    if (plan.fingerprint !== input.expectedFingerprint)
      throw new EditorialError(409, 'stale_category_retirement_plan')
    if (!plan.canRetire)
      throw new EditorialError(409, plan.reason ?? 'category_retirement_blocked')

    const owns = await initTransaction(req)
    try {
      const counts = await referenceCounts(req, input.categoryId)
      if (counts.activePosts || counts.activePages)
        throw new EditorialError(409, 'category_referenced_during_retirement')
      const stored = await req.payload.update({
        collection: 'categories', id: input.categoryId,
        data: { retiredAt: new Date().toISOString() },
        depth: 0, overrideAccess: true, req,
      })
      if (!stored.retiredAt || stored.slug !== plan.category.slug)
        throw new EditorialError(409, 'category_retirement_verification_failed')
      if (owns) await commitTransaction(req)
      return {
        ok: true, id: stored.id, slug: stored.slug, retiredAt: stored.retiredAt,
        changed: true, historyPreserved: true, updatedAt: stored.updatedAt,
      }
    } catch (error) {
      if (owns) await killTransaction(req)
      throw error
    }
  }))
}

export async function restoreCategory(
  req: PayloadRequest,
  input: CategoryRestoreInput,
): Promise<CategoryRetirementResult> {
  return withCategoryLock(req, input.categoryId, async () => {
    const existing = await byId(req, input.categoryId)
    if (!existing) throw new EditorialError(404, 'category_not_found')
    if (!existing.retiredAt)
      return {
        ok: true, id: existing.id, slug: existing.slug, retiredAt: null,
        changed: false, historyPreserved: true, updatedAt: existing.updatedAt,
      }
    if (Date.parse(existing.updatedAt) !== Date.parse(input.expectedUpdatedAt))
      throw new EditorialError(409, 'stale_category_restoration')

    const owns = await initTransaction(req)
    try {
      const stored = await req.payload.update({
        collection: 'categories', id: input.categoryId,
        data: { retiredAt: null },
        depth: 0, overrideAccess: true, req,
      })
      if (stored.retiredAt || stored.slug !== existing.slug)
        throw new EditorialError(409, 'category_restoration_verification_failed')
      if (owns) await commitTransaction(req)
      return {
        ok: true, id: stored.id, slug: stored.slug, retiredAt: null,
        changed: true, historyPreserved: true, updatedAt: stored.updatedAt,
      }
    } catch (error) {
      if (owns) await killTransaction(req)
      throw error
    }
  })
}
