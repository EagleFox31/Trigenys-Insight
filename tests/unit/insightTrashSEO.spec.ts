// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Post } from '@/payload-types'
import { revalidatePost } from '@/collections/Posts/hooks/revalidatePost'

const mocks = vi.hoisted(() => ({
  paths: vi.fn(),
  tags: vi.fn(),
  notify: vi.fn(async () => ({ status: 'submitted' as const, count: 2, httpStatus: 202 })),
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.paths, revalidateTag: mocks.tags }))
vi.mock('@/seo/indexNow', () => ({
  collectLocalizedPostUrls: vi.fn(async ({ slug }: { slug: string }) => [
    `https://insight.trigenys.com/fr/posts/${slug}`,
    `https://insight.trigenys.com/en/posts/${slug}`,
  ]),
  indexNowPostFingerprint: vi.fn((post: { title: string }) => post.title),
  submitIndexNowUrls: mocks.notify,
}))

const date = '2026-10-29T09:14:00.000Z'
function post(deletedAt: string | null, title = 'Published article') {
  return {
    id: 35, _status: 'published', slug: 'verified-article', title,
    deletedAt, updatedAt: date,
  } as unknown as Post
}
async function change(previousDoc: Post, doc: Post, disabledIndexNow = false) {
  const payload = {
    logger: { info: vi.fn(), warn: vi.fn() },
    findByID: vi.fn(),
  }
  const context = { disableRevalidate: false, disableIndexNow: disabledIndexNow }
  await revalidatePost({
    doc, previousDoc, req: { payload, context },
  } as unknown as Parameters<typeof revalidatePost>[0])
  return payload
}
beforeEach(() => vi.clearAllMocks())

describe('native trash and public SEO invalidation', () => {
  it('invalidates the archive and notifies both former public URLs when soft-deleted', async () => {
    const payload = await change(post(null), post(date))
    expect(mocks.paths).toHaveBeenCalledWith('/fr/posts/verified-article')
    expect(mocks.paths).toHaveBeenCalledWith('/en/posts/verified-article')
    expect(mocks.tags).toHaveBeenCalled()
    expect(mocks.notify).toHaveBeenCalledOnce()
    expect(mocks.notify).toHaveBeenCalledWith([
      'https://insight.trigenys.com/fr/posts/verified-article',
      'https://insight.trigenys.com/en/posts/verified-article',
    ])
    expect(payload.findByID).not.toHaveBeenCalled()
  })
  it('notifies when restoring a published article from trash', async () => {
    await change(post(date), post(null))
    expect(mocks.notify).toHaveBeenCalledOnce()
    expect(mocks.paths).toHaveBeenCalledWith('/fr/posts/verified-article')
  })
  it('does not notify again for unrelated edits of a trashed article', async () => {
    await change(post(date), post(date))
    expect(mocks.notify).not.toHaveBeenCalled()
  })
  it('does not notify IndexNow when explicitly disabled by context', async () => {
    await change(post(null), post(date), true)
    expect(mocks.notify).not.toHaveBeenCalled()
    expect(mocks.paths).toHaveBeenCalled()
  })
})
