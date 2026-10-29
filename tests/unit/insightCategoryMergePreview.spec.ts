// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { planCategoryMerge } from '@/automation/categoryMergePreview'
import { operationSchema } from '../../packages/insight-automation/src/schema'

function fixture({ source = 'technology', target = 'tech-ai', child = false } = {}) {
  const categories = [
    { id: 1, slug: source, title: 'Ancienne rubrique' },
    { id: 7, slug: target, title: 'Nouvelle rubrique' },
    ...(child ? [{ id: 14, slug: 'child', title: 'Enfant', parent: 1 }] : []),
  ]
  const posts = [
    { id: 21, _status: 'published', categories: [1, 7] },
    { id: 22, _status: 'published', categories: [1] },
    { id: 23, _status: 'draft', categories: [1] },
  ]
  const find = vi.fn(async ({ collection, where, draft }: {
    collection: string
    where: { id?: { equals: number }; parent?: { equals: number }; categories?: { in: number[] } }
    draft?: boolean
  }) => {
    const rows = collection === 'posts' ? posts : categories
    const docs = rows.filter((r) => {
      if (where.id && r.id !== where.id.equals) return false
      if (where.parent && (!('parent' in r) || r.parent !== where.parent.equals)) return false
      if (where.categories && (!('categories' in r) || !r.categories.some((n: number) => where.categories!.in.includes(n)))) return false
      if (draft === false && ' _status' in r && r[' _status'] !== 'published') return false
      if (draft === false && '_status' in r && r._status !== 'published') return false
      return true
    })
    return { docs, totalDocs: docs.length }
  })
  const create = vi.fn()
  const update = vi.fn()
  const del = vi.fn()
  return { req: { payload: { find, create, update, delete: del } } as unknown as PayloadRequest, create, update, del }
}

describe('category merge preview (no writes)', () => {
  it('recognizes a matching legacy category, with accurate published and duplicate impacts', async () => {
    const { req, create, update, del } = fixture()
    const result = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr' })
    expect(result).toMatchObject({
      dryRun: true,
      matchingEditorialRubric: true,
      canAutoMerge: true,
      affectedPostIds: [21, 22, 23],
      alreadyInTarget: [21],
      publishedPostIds: [21, 22],
      projectedPostCount: 3,
    })
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })
  it('refuses a cross-rubric merge without editorial review', async () => {
    const { req } = fixture({ target: 'business-finance' })
    expect(await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr' }))
      .toMatchObject({ canAutoMerge: false, reason: 'categories_belong_to_different_rubrics_requires_editorial_review' })
  })
  it('blocks moving a canonical rubric or a category that still has nested children', async () => {
    const one = fixture({ source: 'tech-ai', target: 'technology' })
    expect(await planCategoryMerge(one.req, { sourceId: 1, targetId: 7, locale: 'fr' }))
      .toMatchObject({ canAutoMerge: false, reason: 'source_is_canonical_editorial_rubric' })
    const other = fixture({ child: true })
    expect(await planCategoryMerge(other.req, { sourceId: 1, targetId: 7, locale: 'en' }))
      .toMatchObject({ canAutoMerge: false, childCategoryIds: [14] })
  })
  it('rejects self-merges at service level and invalid IDs at input level', async () => {
    const { req } = fixture()
    await expect(planCategoryMerge(req, { sourceId: 1, targetId: 1, locale: 'fr' }))
      .rejects.toMatchObject({ status: 422 })
    expect(operationSchema.safeParse({ operation: 'plan-category-merge', sourceId: -1, targetId: 7 })).toHaveProperty('success', false)
  })
})
