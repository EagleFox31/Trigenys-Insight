// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { planCategoryMerge } from '@/automation/categoryMergePreview'
import { applyCategoryMerge } from '@/automation/categoryMergeApply'

const transaction = vi.hoisted(() => ({
  init: vi.fn(async () => true),
  commit: vi.fn(async () => undefined),
  rollback: vi.fn(async () => undefined),
}))
vi.mock('payload', () => ({
  initTransaction: transaction.init,
  commitTransaction: transaction.commit,
  killTransaction: transaction.rollback,
}))

const timestamp = '2026-10-29T11:00:00.000Z'
function fixture(options: {
  pendingDraft?: boolean
  liveSourceOnly?: boolean
  corruptPublishedEnglish?: boolean
  scheduled?: boolean
} = {}) {
  const categories = [
    { id: 1, slug: 'technology', title: 'Legacy', updatedAt: timestamp },
    { id: 7, slug: 'tech-ai', title: 'Canonical', updatedAt: timestamp },
  ]
  const fr = { id: 25, slug: 'news', title: 'Un article', _status: 'published' as const,
    categories: [1, 4], updatedAt: timestamp, createdAt: timestamp, publishedAt: timestamp,
    content: { root: { children: [{ text: 'Français original' }] } } }
  const en = { ...fr, title: 'One article',
    content: { root: { children: [{ text: 'English original' }] } } }
  let pubFr = structuredClone(fr)
  let pubEn = structuredClone(en)
  let latest = {
    ...fr,
    _status: options.pendingDraft ? 'draft' as const : 'published' as const,
    categories: options.liveSourceOnly ? [7, 4] : [1, 4],
  }
  const query = vi.fn(async (s: string) => ({ rows: [{ locked: s.includes('try_advisory') ? true : true }] }))
  const release = vi.fn()
  const find = vi.fn(async (args: {
    collection: string
    where?: { categories?: { in: number[] }; id?: { in: number[]; equals?: number }; parent?: { equals: number } }
    draft?: boolean
    locale?: 'fr' | 'en'
  }) => {
    if (args.collection === 'payload-jobs')
      return { docs: options.scheduled ? [{ id: 2 }] : [], totalDocs: options.scheduled ? 1 : 0 }
    const source = args.collection === 'categories'
      ? categories
      : args.draft === false ? [args.locale === 'en' ? pubEn : pubFr] : [latest]
    const docs = source.filter((item) => {
      if (args.where?.id?.equals && item.id !== args.where.id.equals) return false
      if (args.where?.id?.in && !args.where.id.in.includes(item.id)) return false
      if (args.where?.parent) return false
      if (args.where?.categories && (!('categories' in item) ||
        !item.categories.some((cat: number) => args.where!.categories!.in.includes(cat)))) return false
      return true
    })
    return { docs, totalDocs: docs.length }
  })
  const update = vi.fn(async (args: { id: number; draft: boolean; locale: string;
    data: { _status: 'published' | 'draft'; categories: number[] } }) => {
    expect(args.id).toBe(25)
    expect(args.draft).toBe(false)
    expect(args.data._status).toBe('published')
    latest = { ...latest, _status: 'published', categories: [...args.data.categories], updatedAt: '2026-10-29T11:02:00.000Z' }
    pubFr = { ...pubFr, categories: [...args.data.categories], updatedAt: latest.updatedAt }
    pubEn = { ...pubEn, categories: [...args.data.categories], updatedAt: latest.updatedAt }
    if (options.corruptPublishedEnglish)
      pubEn = { ...pubEn, title: 'Unexpected publication change' }
    return latest
  })
  const req = { payload: { find, update,
    db: { pool: { connect: vi.fn(async () => ({ query, release })) } },
  } } as unknown as PayloadRequest
  return { req, find, update }
}
beforeEach(() => vi.clearAllMocks())

describe('published category merge safety', () => {
  it('requires includePublished for every live article and fingerprints both snapshots', async () => {
    const { req, update } = fixture()
    const restricted = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr', includePublished: false })
    expect(restricted).toMatchObject({
      includePublished: false, canAutoMerge: false,
      reason: 'published_posts_require_separate_migration', publishedPostIds: [25],
    })
    const permitted = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr', includePublished: true })
    expect(permitted).toMatchObject({ canAutoMerge: true, publishedPostIds: [25] })
    expect(permitted.fingerprint).not.toBe(restricted.fingerprint)
    expect(update).not.toHaveBeenCalled()
  })

  it('changes only category relations and preserves FR+EN public text and slug', async () => {
    const { req, update } = fixture()
    const plan = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr', includePublished: true })
    const result = await applyCategoryMerge(req, {
      sourceId: 1, targetId: 7, locale: 'fr', includePublished: true,
      expectedFingerprint: plan.fingerprint, confirm: true,
    })
    expect(result).toMatchObject({
      changed: true, updatedPostIds: [25], publishedPostIds: [25],
      dryRun: false, retainedSourceCategory: true,
    })
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      draft: false, data: { _status: 'published', categories: [7, 4] },
    }))
    expect(transaction.commit).toHaveBeenCalledTimes(1)
    expect(transaction.rollback).not.toHaveBeenCalled()
  })

  it('refuses to publish over a newer draft even when the draft no longer uses source', async () => {
    for (const liveSourceOnly of [true, false]) {
      const { req, update } = fixture({ pendingDraft: true, liveSourceOnly })
      const preview = await planCategoryMerge(req, {
        sourceId: 1, targetId: 7, locale: 'fr', includePublished: true,
      })
      expect(preview).toMatchObject({ canAutoMerge: false, reason: 'published_post_has_pending_revision' })
      await expect(applyCategoryMerge(req, {
        sourceId: 1, targetId: 7, locale: 'fr', includePublished: true,
        expectedFingerprint: preview.fingerprint, confirm: true,
      })).rejects.toMatchObject({ code: 'published_post_has_pending_revision' })
      expect(update).not.toHaveBeenCalled()
    }
  })

  it('blocks scheduled publications during live category changes', async () => {
    const { req, update } = fixture({ scheduled: true })
    const plan = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr', includePublished: true })
    await expect(applyCategoryMerge(req, {
      sourceId: 1, targetId: 7, locale: 'fr', includePublished: true,
      expectedFingerprint: plan.fingerprint, confirm: true,
    })).rejects.toMatchObject({ code: 'post_has_pending_publication' })
    expect(update).not.toHaveBeenCalled()
    expect(transaction.rollback).toHaveBeenCalledTimes(1)
  })

  it('rolls back the entire merge when English published content changes unexpectedly', async () => {
    const { req } = fixture({ corruptPublishedEnglish: true })
    const plan = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr', includePublished: true })
    await expect(applyCategoryMerge(req, {
      sourceId: 1, targetId: 7, locale: 'fr', includePublished: true,
      expectedFingerprint: plan.fingerprint, confirm: true,
    })).rejects.toMatchObject({ code: 'published_content_changed_during_category_merge' })
    expect(transaction.commit).not.toHaveBeenCalled()
    expect(transaction.rollback).toHaveBeenCalledTimes(1)
  })

  it('blocks an opt-in mismatch using the existing preview fingerprint', async () => {
    const { req, update } = fixture()
    const original = await planCategoryMerge(req, { sourceId: 1, targetId: 7, locale: 'fr', includePublished: true })
    await expect(applyCategoryMerge(req, {
      sourceId: 1, targetId: 7, locale: 'fr', includePublished: false,
      expectedFingerprint: original.fingerprint, confirm: true,
    })).rejects.toMatchObject({ code: 'stale_category_merge_plan' })
    expect(update).not.toHaveBeenCalled()
  })
})
