// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { operationSchema } from '../../packages/insight-automation/src/schema'
import { planCategoryMerge } from '@/automation/categoryMergePreview'
import { applyCategoryMerge } from '@/automation/categoryMergeApply'

const transactions = vi.hoisted(() => ({
  init: vi.fn(async () => true),
  commit: vi.fn(async () => undefined),
  rollback: vi.fn(async () => undefined),
}))
vi.mock('payload', () => ({
  initTransaction: transactions.init,
  commitTransaction: transactions.commit,
  killTransaction: transactions.rollback,
}))

const time = '2026-10-29T12:10:00.000Z'
function fixture({ published = false, failUpdateAt = -1, child = false, locked = true } = {}) {
  const categoryDocs = [
    { id: 1, slug: 'technology', title: 'Technologie', updatedAt: time },
    { id: 7, slug: 'tech-ai', title: 'Tech & IA', updatedAt: time },
    ...(child ? [{ id: 14, slug: 'nested', title: 'Nested', updatedAt: time, parent: 1 }] : []),
  ]
  let articleDocs = [
    { id: 21, _status: published ? 'published' : 'draft', updatedAt: time, categories: [1, 7, 5], content: { text: 'Never replace body' } },
    { id: 22, _status: 'draft', updatedAt: time, categories: [5, 1], content: { text: 'Keep content' } },
  ]
  const query = vi.fn(async (sql: string) => ({
    rows: [{ locked: sql.includes('try_advisory') ? locked : true }],
  }))
  const release = vi.fn()
  const find = vi.fn(async (args: {
    collection: string
    where?: { id?: { equals: number }; parent?: { equals: number }; categories?: { in: number[] } }
    draft?: boolean
  }) => {
    const all = args.collection === 'posts'
      ? articleDocs.filter((p) => args.draft !== false || p._status === 'published')
      : args.collection === 'categories' ? categoryDocs : []
    const docs = all.filter((item) => {
      if (args.where?.id && args.where.id.equals !== item.id) return false
      if (args.where?.parent && !('parent' in item && item.parent === args.where.parent.equals)) return false
      if (args.where?.categories && !('categories' in item && item.categories.some((id: number) => args.where!.categories!.in.includes(id)))) return false
      return true
    })
    return { docs: [...docs], totalDocs: docs.length }
  })
  const update = vi.fn(async (args: {
    collection: string; id: number
    draft: boolean
    data: { categories: number[]; _status: 'draft' }
  }) => {
    if (args.id === failUpdateAt) throw new Error('simulated database failure')
    expect(args.collection).toBe('posts')
    expect(args.draft).toBe(true)
    expect(args.data._status).toBe('draft')
    const current = articleDocs.find((p) => p.id === args.id)
    if (!current) throw new Error('missing fixture article')
    const newPost = { ...current, categories: args.data.categories, updatedAt: '2026-10-29T12:11:00.000Z' }
    articleDocs = articleDocs.map((p) => p.id === args.id ? newPost : p)
    return newPost
  })
  const del = vi.fn()
  const req = { payload: {
    find, update, delete: del,
    db: { pool: { connect: vi.fn(async () => ({ query, release })) } },
  } } as unknown as PayloadRequest
  return { req, find, update, del, query, release, posts: () => articleDocs }
}
beforeEach(() => vi.clearAllMocks())

describe('category merge apply', () => {
  it('atomically replaces draft relationships in order and removes duplicate targets', async () => {
    const { req, update, del, posts, release } = fixture()
    const plan = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr' })
    expect(plan).toMatchObject({ canAutoMerge: true, publishedPostIds: [] })
    const result = await applyCategoryMerge(req, {
      sourceId: 1, targetId: 7, locale: 'fr',
      expectedFingerprint: plan.fingerprint, confirm: true,
    })
    expect(result).toMatchObject({
      ok: true, changed: true, updatedPostIds: [21, 22],
      retainedSourceCategory: true, dryRun: false,
    })
    expect(posts().find((p) => p.id === 21)).toMatchObject({ categories: [7, 5], content: { text: 'Never replace body' } })
    expect(posts().find((p) => p.id === 22)).toMatchObject({ categories: [5, 7], content: { text: 'Keep content' } })
    expect(update).toHaveBeenCalledTimes(2)
    expect(del).not.toHaveBeenCalled()
    expect(transactions.commit).toHaveBeenCalledTimes(1)
    expect(transactions.rollback).not.toHaveBeenCalled()
    expect(release).toHaveBeenCalledTimes(3)
  })

  it('does not run again when the same source has no remaining latest draft references', async () => {
    const { req, update } = fixture()
    const first = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr' })
    await applyCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr', expectedFingerprint: first.fingerprint, confirm: true })
    const second = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr' })
    const result = await applyCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr', expectedFingerprint: second.fingerprint, confirm: true })
    expect(result).toMatchObject({ changed: false, updatedPostIds: [] })
    expect(update).toHaveBeenCalledTimes(2)
  })

  it('rejects a stale preview after an article has changed', async () => {
    const { req, update } = fixture()
    const plan = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr' })
    // A different editor modifies the category relation before apply.
    await update({ collection: 'posts', id: 22, draft: true, data: { categories: [5, 1, 8], _status: 'draft' } })
    await expect(applyCategoryMerge(req, {
      sourceId: 1, targetId: 7, locale: 'fr',
      expectedFingerprint: plan.fingerprint, confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'stale_category_merge_plan' })
    expect(transactions.init).not.toHaveBeenCalled()
  })

  it('rejects published articles, child categories and category types outside the rubric', async () => {
    const { req, update, del } = fixture({ published: true })
    const plan = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'en' })
    expect(plan).toMatchObject({ canAutoMerge: false, reason: 'published_posts_require_separate_migration' })
    await expect(applyCategoryMerge(req, {
      sourceId: 1, targetId: 7, locale: 'en',
      expectedFingerprint: plan.fingerprint, confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'published_posts_require_separate_migration' })
    expect(update).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
    const child = fixture({ child: true })
    const other = await planCategoryMerge(child.req, { sourceId: 1, targetId: 7, locale: 'fr' })
    expect(other.canAutoMerge).toBe(false)
  })

  it('rolls back rather than committing partial work if a post update fails', async () => {
    const { req, del } = fixture({ failUpdateAt: 22 })
    const preview = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr' })
    await expect(applyCategoryMerge(req, {
      sourceId: 1, targetId: 7, locale: 'fr',
      expectedFingerprint: preview.fingerprint, confirm: true,
    })).rejects.toThrow('simulated database failure')
    expect(transactions.commit).not.toHaveBeenCalled()
    expect(transactions.rollback).toHaveBeenCalledTimes(1)
    expect(del).not.toHaveBeenCalled()
  })

  it('refuses missing approval and rejects altered fingerprints before any mutation', async () => {
    const { req, update } = fixture()
    const preview = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr' })
    expect(operationSchema.safeParse({
      operation: 'apply-category-merge', sourceId: 1, targetId: 7, expectedFingerprint: preview.fingerprint,
    }).success).toBe(false)
    await expect(applyCategoryMerge(req, {
      sourceId: 1, targetId: 7, locale: 'fr',
      expectedFingerprint: 'a'.repeat(64), confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'stale_category_merge_plan' })
    expect(update).not.toHaveBeenCalled()
  })
})
