// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { operationSchema } from '../../packages/insight-automation/src/schema'
import { planPostArchive, archivePost, restorePost } from '@/automation/postArchive'

vi.mock('@/automation/scheduling', () => ({
  publicationJobsWhere: (postId: number) => ({ postId }),
  withPublicationLock: async (_req: unknown, action: () => Promise<unknown>) => action(),
}))

const now = '2026-10-29T09:00:00.000Z'
const deletedAt = '2026-10-29T09:12:00.000Z'
function fixture({ publicPost = true, pendingDraft = false, scheduled = false, trashed = false } = {}) {
  let main = {
    id: 35, title: 'Article', slug: 'article-cameroun', updatedAt: now,
    _status: publicPost ? 'published' : 'draft',
    deletedAt: trashed ? deletedAt : null,
    content: { root: { children: [{ text: 'Published content' }] } },
  }
  const latest = { ...main, _status: pendingDraft ? 'draft' : main._status }
  const find = vi.fn(async (args: { collection: string; draft?: boolean; trash?: boolean }) => {
    if (args.collection === 'payload-jobs')
      return { totalDocs: scheduled ? 1 : 0, docs: scheduled ? [{ id: 77 }] : [] }
    if (args.collection !== 'posts') throw new Error('Unexpected collection')
    const post = args.draft ? { ...latest, deletedAt: main.deletedAt } : main
    return { docs: !post.deletedAt || args.trash ? [post] : [], totalDocs: 1 }
  })
  const softDelete = vi.fn(async (args: { trash?: boolean }) => {
    expect(args.trash).toBe(true)
    main = { ...main, deletedAt, updatedAt: deletedAt }
    return main
  })
  const update = vi.fn(async (args: { trash?: boolean; data: { deletedAt: null }; draft?: boolean }) => {
    expect(args.trash).toBe(true)
    expect(args.draft).toBe(false)
    expect(args.data).toEqual({ deletedAt: null })
    main = { ...main, deletedAt: null, updatedAt: '2026-10-29T09:13:00.000Z' }
    return main
  })
  return { req: { payload: { find, delete: softDelete, update } } as unknown as PayloadRequest, find, softDelete, update }
}

describe('native reversible article archive', () => {
  it('previews public posts with unpublished drafts, without changing publication or versions', async () => {
    const { req, softDelete, update } = fixture({ pendingDraft: true })
    const plan = await planPostArchive(req, { postId: 35 })
    expect(plan).toMatchObject({
      isPublic: true, archived: false, hasPendingDraft: true,
      canArchive: true, pendingPublications: 0,
    })
    expect(softDelete).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
  it('soft-deletes one post, preserves the main published snapshot, and is idempotent', async () => {
    const { req, softDelete, update } = fixture({ publicPost: true })
    const first = await archivePost(req, { postId: 35, expectedUpdatedAt: now, confirm: true })
    expect(first).toMatchObject({ changed: true, archived: true, isPublic: true, deletedAt })
    expect(softDelete).toHaveBeenCalledTimes(1)
    expect(update).not.toHaveBeenCalled()
    const again = await archivePost(req, { postId: 35, expectedUpdatedAt: now, confirm: true })
    expect(again.changed).toBe(false)
    expect(softDelete).toHaveBeenCalledTimes(1)
  })
  it('requires explicit authorization for public restoration', async () => {
    const { req, update } = fixture({ trashed: true })
    await expect(restorePost(req, {
      postId: 35, expectedDeletedAt: deletedAt, confirm: true, allowPublicRestore: false,
    })).rejects.toMatchObject({ status: 409, code: 'restoration_would_republish_requires_confirmation' })
    expect(update).not.toHaveBeenCalled()
    const result = await restorePost(req, {
      postId: 35, expectedDeletedAt: deletedAt, confirm: true, allowPublicRestore: true,
    })
    expect(result).toMatchObject({ archived: false, isPublic: true, changed: true })
    const again = await restorePost(req, {
      postId: 35, expectedDeletedAt: deletedAt, confirm: true, allowPublicRestore: true,
    })
    expect(again.changed).toBe(false)
    expect(update).toHaveBeenCalledTimes(1)
  })
  it('restores private drafts without publishing them', async () => {
    const { req } = fixture({ publicPost: false, trashed: true })
    const result = await restorePost(req, {
      postId: 35, expectedDeletedAt: deletedAt, confirm: true,
      allowPublicRestore: false,
    })
    expect(result).toMatchObject({ changed: true, archived: false, isPublic: false })
  })
  it('rejects scheduled articles, stale confirmations and unapproved writes', async () => {
    const { req, softDelete } = fixture({ scheduled: true })
    const plan = await planPostArchive(req, { postId: 35 })
    expect(plan.canArchive).toBe(false)
    await expect(archivePost(req, { postId: 35, expectedUpdatedAt: now, confirm: true }))
      .rejects.toMatchObject({ status: 409, code: 'post_has_pending_publication' })
    expect(softDelete).not.toHaveBeenCalled()
    const fresh = fixture()
    await expect(archivePost(fresh.req, {
      postId: 35, expectedUpdatedAt: '2026-10-28T09:00:00.000Z', confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'stale_archive_plan' })
    expect(operationSchema.safeParse({ operation: 'archive-post', postId: 35, expectedUpdatedAt: now }).success).toBe(false)
    expect(operationSchema.safeParse({ operation: 'restore-post', postId: 35, expectedDeletedAt: deletedAt }).success).toBe(false)
  })
})
