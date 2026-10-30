// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { operationSchema } from '../../packages/insight-automation/src/schema'
import { planCategoryRetirement, retireCategory, restoreCategory } from '@/automation/categoryRetirement'

const txn = vi.hoisted(() => ({
  init: vi.fn(async () => true),
  commit: vi.fn(async () => undefined),
  rollback: vi.fn(async () => undefined),
}))
vi.mock('payload', () => ({
  initTransaction: txn.init,
  commitTransaction: txn.commit,
  killTransaction: txn.rollback,
}))
const originalTime = '2026-10-30T09:25:00.000Z'
const newTime = '2026-10-30T09:40:00.000Z'
function fixture(options: {
  sourceSlug?: string
  activePosts?: number
  published?: number
  currentRefs?: number
  pageRefs?: number
  historical?: number
  children?: boolean
  targetMissing?: boolean
  initiallyRetired?: boolean
  failUpdate?: boolean
} = {}) {
  const source = {
    id: 1, slug: options.sourceSlug ?? 'technology', title: 'Technologie',
    updatedAt: originalTime, retiredAt: options.initiallyRetired ? originalTime : null,
  }
  const target = {
    id: 7, slug: 'tech-ai', title: 'Tech & IA', updatedAt: originalTime, retiredAt: null,
  }
  const docs = [source, ...(options.targetMissing ? [] : [target])]
  const articles = Array.from({ length: options.activePosts ?? 0 }, (_, i) => ({
    id: i + 20, _status: i < (options.published ?? 0) ? 'published' : 'draft',
    categories: [1, 7],
  }))
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('historical_versions')) return {
      rows: [{
        active_posts: options.currentRefs ?? articles.length,
        active_pages: options.pageRefs ?? 0,
        historical_versions: options.historical ?? 22,
      }],
    }
    return { rows: [{ locked: true }] }
  })
  const release = vi.fn()
  const find = vi.fn(async (args: {
    collection: string
    where: { id?: { equals: number }; slug?: { equals: string };
      parent?: { equals: number }; categories?: { in: number[] } }
    draft?: boolean
  }) => {
    if (args.collection === 'categories') {
      const rows = args.where.parent
        ? options.children ? [{ id: 19, slug: 'nested', title: 'Subcategory' }] : []
        : docs.filter((d) => args.where.id
          ? d.id === args.where.id.equals
          : d.slug === args.where.slug?.equals)
      return { docs: rows, totalDocs: rows.length }
    }
    if (args.collection !== 'posts') throw new Error('Unexpected collection')
    const rows = articles.filter((post) => args.draft !== false || post._status === 'published')
    return { docs: rows, totalDocs: rows.length }
  })
  const update = vi.fn(async (args: { collection: string; id: number; data: { retiredAt: string | null } }) => {
    if (options.failUpdate) throw new Error('test update failed')
    expect(args.collection).toBe('categories')
    expect(args.id).toBe(1)
    source.retiredAt = args.data.retiredAt
    source.updatedAt = newTime
    return { ...source }
  })
  const del = vi.fn()
  const req = {
    payload: {
      find, update, delete: del,
      db: { pool: { connect: vi.fn(async () => ({ query, release })) } },
    },
  } as unknown as PayloadRequest
  return { req, find, update, del, query, release, source }
}
beforeEach(() => vi.clearAllMocks())

describe('reversible legacy category retirement', () => {
  it('reports historical versions but does not treat them as live usage', async () => {
    const { req, update, del } = fixture({ historical: 22 })
    const plan = await planCategoryRetirement(req, { categoryId: 1, locale: 'fr' })
    expect(plan).toMatchObject({
      dryRun: true, canRetire: true,
      category: { id: 1, slug: 'technology', retiredAt: null },
      replacement: { id: 7, slug: 'tech-ai' },
      activePostIds: [], pageReferenceCount: 0, historicalVersionCount: 22,
    })
    expect(plan.fingerprint).toMatch(/^[0-9a-f]{64}$/)
    expect(update).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })

  it('blocks still-assigned draft or public articles, page links and nested categories', async () => {
    for (const o of [
      { activePosts: 2, published: 1 },
      { currentRefs: 1 },
    ]) {
      const { req } = fixture(o)
      expect(await planCategoryRetirement(req, { categoryId: 1 }))
        .toMatchObject({ canRetire: false, reason: 'category_still_used_by_posts' })
    }
    const page = fixture({ pageRefs: 1 })
    expect(await planCategoryRetirement(page.req, { categoryId: 1 }))
      .toMatchObject({ canRetire: false, reason: 'category_still_used_by_pages' })
    const child = fixture({ children: true })
    expect(await planCategoryRetirement(child.req, { categoryId: 1 }))
      .toMatchObject({ canRetire: false, reason: 'category_has_children' })
  })

  it('refuses canonical or unrecognized categories and missing replacements', async () => {
    const canonical = fixture({ sourceSlug: 'tech-ai' })
    expect(await planCategoryRetirement(canonical.req, { categoryId: 1 }))
      .toMatchObject({ canRetire: false, reason: 'only_legacy_categories_can_be_retired' })
    const target = fixture({ targetMissing: true })
    expect(await planCategoryRetirement(target.req, { categoryId: 1 }))
      .toMatchObject({ canRetire: false, reason: 'active_canonical_replacement_missing' })
  })

  it('retire and restore change only metadata, never delete historical references', async () => {
    const { req, update, del } = fixture()
    const plan = await planCategoryRetirement(req, { categoryId: 1, locale: 'fr' })
    const retired = await retireCategory(req, {
      categoryId: 1, locale: 'fr', expectedFingerprint: plan.fingerprint, confirm: true,
    })
    expect(retired).toMatchObject({
      id: 1, slug: 'technology', changed: true, historyPreserved: true,
    })
    expect(retired.retiredAt).toBeTruthy()
    expect(update).toHaveBeenCalledTimes(1)
    const restored = await restoreCategory(req, {
      categoryId: 1, expectedUpdatedAt: retired.updatedAt, confirm: true,
    })
    expect(restored).toMatchObject({
      id: 1, slug: 'technology', changed: true, retiredAt: null, historyPreserved: true,
    })
    expect(update).toHaveBeenCalledTimes(2)
    expect(del).not.toHaveBeenCalled()
    expect(txn.commit).toHaveBeenCalledTimes(2)
  })

  it('rejects stale retirement plans and stale restore timestamps', async () => {
    const { req, update } = fixture()
    await expect(retireCategory(req, {
      categoryId: 1, expectedFingerprint: 'f'.repeat(64), confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'stale_category_retirement_plan' })
    expect(update).not.toHaveBeenCalled()

    const retiring = fixture({ initiallyRetired: true })
    await expect(restoreCategory(retiring.req, {
      categoryId: 1, expectedUpdatedAt: '2026-10-29T09:00:00.000Z', confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'stale_category_restoration' })
    expect(retiring.update).not.toHaveBeenCalled()
  })

  it('restoration is idempotent when already active; failed updates roll back', async () => {
    const clean = fixture()
    expect(await restoreCategory(clean.req, {
      categoryId: 1, expectedUpdatedAt: originalTime, confirm: true,
    })).toMatchObject({ changed: false, retiredAt: null })
    expect(clean.update).not.toHaveBeenCalled()

    const bad = fixture({ failUpdate: true })
    const plan = await planCategoryRetirement(bad.req, { categoryId: 1 })
    await expect(retireCategory(bad.req, {
      categoryId: 1, expectedFingerprint: plan.fingerprint, confirm: true,
    })).rejects.toThrow('test update failed')
    expect(txn.rollback).toHaveBeenCalledTimes(1)
    expect(txn.commit).not.toHaveBeenCalled()
  })

  it('rejects missing confirmation, malformed IDs and fingerprint at schema boundary', () => {
    expect(operationSchema.safeParse({
      operation: 'retire-category', categoryId: 1, expectedFingerprint: '0'.repeat(64),
    }).success).toBe(false)
    expect(operationSchema.safeParse({
      operation: 'restore-category', categoryId: 1, expectedUpdatedAt: originalTime,
    }).success).toBe(false)
    expect(operationSchema.safeParse({
      operation: 'retire-category', categoryId: 0, expectedFingerprint: 'oops', confirm: true,
    }).success).toBe(false)
  })
})
