// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { operationSchema } from '../../packages/insight-automation/src/schema'
import { applySlugChange, planSlugChange, resolveAutomationSlugAlias } from '@/automation/slugManagement'

vi.mock('payload', () => ({
  initTransaction: vi.fn(async () => true),
  commitTransaction: vi.fn(async () => undefined),
  killTransaction: vi.fn(async () => undefined),
}))

const date = '2026-10-29T08:00:00.000Z'
function fixture({ pending = false, taken = false, publicPost = true } = {}) {
  const post = {
    id: 35,
    slug: 'editorial-os-abc123',
    title: 'Article camerounais',
    excerpt: 'Résumé',
    content: { root: { children: [{ text: 'Texte visible' }] } },
    _status: pending || !publicPost ? 'draft' : 'published',
    updatedAt: date,
    createdAt: date,
    categories: [1],
    authors: [1],
    meta: { title: 'SEO', description: 'Résumé SEO' },
  }
  let current = { ...post }
  let publiclyVisible = publicPost ? { ...post, _status: 'published' } : null
  const redirects: Array<{ id: number; from: string; to: { type: string; reference: { relationTo: string; value: number } } }> = []
  const query = vi.fn(async (statement: string) => ({
    rows: statement.includes('try_advisory_lock') ? [{ locked: true }] : [{}],
  }))
  const release = vi.fn()
  const find = vi.fn(async (args: {
    collection: string
    where?: { id?: { equals: number }; slug?: { equals: string }; from?: { in?: string[]; equals?: string } }
    draft?: boolean
  }) => {
    if (args.collection === 'payload-jobs') return { docs: [], totalDocs: 0 }
    if (args.collection === 'redirects') {
      const docs = redirects.filter((entry) =>
        args.where?.from?.in?.includes(entry.from) || args.where?.from?.equals === entry.from)
      return { docs, totalDocs: docs.length }
    }
    if (args.collection === 'posts') {
      let docs = args.draft === false ? (publiclyVisible ? [publiclyVisible] : []) : [current]
      if (args.where?.id) docs = docs.filter((p) => p.id === args.where?.id?.equals)
      if (args.where?.slug) docs = docs.filter((p) => p.slug === args.where?.slug?.equals)
      if (taken && args.where?.slug?.equals === 'nouveau-slug') docs = [...docs, { ...post, id: 88, slug: 'nouveau-slug' }]
      return { docs, totalDocs: docs.length }
    }
    throw new Error('Unexpected collection')
  })
  const create = vi.fn(async (args: { collection: string; data: typeof redirects[number] }) => {
    if (args.collection !== 'redirects') throw new Error('Unexpected create')
    const record = { ...args.data, id: redirects.length + 1 }
    redirects.push(record)
    return record
  })
  const update = vi.fn(async (args: { collection: string; data: { slug: string; generateSlug: boolean } }) => {
    if (args.collection !== 'posts') throw new Error('Unexpected update')
    current = { ...current, ...args.data, updatedAt: '2026-10-29T09:00:00.000Z' }
    if (publiclyVisible)
      publiclyVisible = { ...publiclyVisible, ...args.data, updatedAt: '2026-10-29T09:00:00.000Z' }
    return publiclyVisible ?? current
  })
  const payload = { find, create, update, db: { pool: { connect: vi.fn(async () => ({ query, release })) } } }
  return { req: { payload } as unknown as PayloadRequest, find, create, update, redirects, query, release }
}

describe('guarded editorial slug management', () => {
  it('previews an existing published article without modifying anything', async () => {
    const { req, create, update } = fixture()
    const plan = await planSlugChange(req, { postId: 35, newSlug: 'commerce-cameroun-2026' })
    expect(plan).toMatchObject({
      canApply: true,
      currentSlug: 'editorial-os-abc123',
      isPublic: true,
      hasPendingRevision: false,
    })
    expect(plan.oldPaths).toEqual([
      '/posts/editorial-os-abc123',
      '/fr/posts/editorial-os-abc123',
      '/en/posts/editorial-os-abc123',
    ])
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('atomically registers FR, EN and legacy aliases then changes only the slug', async () => {
    const { req, create, update, release, redirects } = fixture()
    const preview = await planSlugChange(req, { postId: 35, newSlug: 'commerce-cameroun-2026' })
    const result = await applySlugChange(req, {
      postId: 35,
      newSlug: 'commerce-cameroun-2026',
      expectedSlug: preview.currentSlug,
      expectedUpdatedAt: preview.expectedUpdatedAt,
      confirm: true,
    })
    expect(result.changed).toBe(true)
    expect(create).toHaveBeenCalledTimes(3)
    expect(redirects.every((item) => item.to.reference.value === 35)).toBe(true)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'posts',
      data: { slug: 'commerce-cameroun-2026', generateSlug: false },
      draft: false,
    }))
    expect(release).toHaveBeenCalledTimes(1)
    expect(await resolveAutomationSlugAlias(req, 'editorial-os-abc123')).toBe(35)
  })

  it('blocks a live article when a newer draft exists, without touching public data', async () => {
    const { req, create, update } = fixture({ pending: true })
    const plan = await planSlugChange(req, { postId: 35, newSlug: 'commerce-cameroun-2026' })
    expect(plan).toMatchObject({ canApply: false, reason: 'post_has_pending_revision' })
    await expect(applySlugChange(req, {
      postId: 35, newSlug: 'commerce-cameroun-2026',
      expectedSlug: plan.currentSlug, expectedUpdatedAt: plan.expectedUpdatedAt, confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'post_has_pending_revision' })
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects collisions, stale plans and non-approved apply requests', async () => {
    const { req, update } = fixture({ taken: true })
    const plan = await planSlugChange(req, { postId: 35, newSlug: 'nouveau-slug' })
    expect(plan.reason).toBe('slug_already_used')
    await expect(applySlugChange(req, {
      postId: 35, newSlug: 'nouveau-slug', expectedSlug: 'editorial-os-abc123',
      expectedUpdatedAt: date, confirm: true,
    })).rejects.toMatchObject({ status: 409 })
    await expect(applySlugChange(req, {
      postId: 35, newSlug: 'autre-slug', expectedSlug: 'editorial-os-abc123',
      expectedUpdatedAt: '2026-10-29T07:00:00.000Z', confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'stale_slug_plan' })
    expect(operationSchema.safeParse({
      operation: 'apply-slug-change', postId: 35, newSlug: 'autre-slug',
      expectedSlug: 'editorial-os-abc123', expectedUpdatedAt: date,
    }).success).toBe(false)
    expect(operationSchema.safeParse({
      operation: 'plan-slug-change', postId: 35, newSlug: '../evil',
    }).success).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })
})
