// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { operationSchema } from '../../packages/insight-automation/src/schema'
import { createCategory, renameCategory } from '@/automation/categoryManagement'

const tx = vi.hoisted(() => ({
  init: vi.fn(async () => true),
  commit: vi.fn(async () => undefined),
  rollback: vi.fn(async () => undefined),
}))
vi.mock('payload', () => ({
  initTransaction: tx.init,
  commitTransaction: tx.commit,
  killTransaction: tx.rollback,
}))

const date = '2026-10-29T10:00:00.000Z'
const edited = '2026-10-29T10:10:00.000Z'

function fixture({ failEnglish = false, lock = true } = {}) {
  const rows = [
    { id: 1, slug: 'technology', titleFr: 'Technologie', titleEn: 'Technology', updatedAt: date },
    { id: 7, slug: 'tech-ai', titleFr: 'Tech & IA', titleEn: 'Tech & AI', updatedAt: date },
  ]
  const query = vi.fn(async (statement: string) => ({
    rows: [{ locked: statement.includes('try_advisory_lock') ? lock : true }],
  }))
  const release = vi.fn()
  const find = vi.fn(async (args: {
    collection: string
    where: { slug?: { equals: string }; id?: { equals: number } }
    locale: 'fr' | 'en'
  }) => {
    if (args.collection !== 'categories') throw new Error('unexpected collection')
    const x = rows.find((r) => args.where.id ? r.id === args.where.id.equals : r.slug === args.where.slug?.equals)
    const doc = x ? { id: x.id, slug: x.slug, title: args.locale === 'en' ? x.titleEn : x.titleFr, updatedAt: x.updatedAt } : undefined
    return { docs: doc ? [doc] : [], totalDocs: doc ? 1 : 0 }
  })
  const create = vi.fn(async (args: {
    collection: string
    data: { slug: string; title: string; generateSlug: boolean }
    locale: 'fr'
  }) => {
    expect(args.data.generateSlug).toBe(false)
    const row = {
      id: 13, slug: args.data.slug, titleFr: args.data.title,
      titleEn: '', updatedAt: edited,
    }
    rows.push(row)
    return { id: row.id, title: row.titleFr, slug: row.slug, updatedAt: row.updatedAt }
  })
  const update = vi.fn(async (args: {
    collection: string
    id: number
    locale: 'fr' | 'en'
    data: { title: string; slug: string; generateSlug: boolean }
  }) => {
    if (failEnglish && args.locale === 'en') throw new Error('English title write failed')
    const row = rows.find((r) => r.id === args.id)
    if (!row) throw new Error('row missing')
    expect(args.data.generateSlug).toBe(false)
    expect(args.data.slug).toBe(row.slug)
    if (args.locale === 'fr') row.titleFr = args.data.title
    else row.titleEn = args.data.title
    row.updatedAt = edited
    return { id: row.id, title: args.data.title, slug: row.slug, updatedAt: row.updatedAt }
  })
  const req = {
    payload: {
      find, create, update,
      db: { pool: { connect: vi.fn(async () => ({ query, release })) } },
    },
  } as unknown as PayloadRequest
  return { req, rows, create, update, find, query, release }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('category creation and localized rename', () => {
  it('creates both language titles with one stable slug in a single transaction', async () => {
    const { req, rows, create, update } = fixture()
    const result = await createCategory(req, {
      slug: 'african-startups', titleFr: 'Startups africaines',
      titleEn: 'African Startups', confirm: true,
    })
    expect(result).toMatchObject({
      ok: true, id: 13, slug: 'african-startups',
      titleFr: 'Startups africaines', titleEn: 'African Startups',
      changed: true, created: true,
    })
    expect(rows.at(-1)).toMatchObject({ titleFr: 'Startups africaines', titleEn: 'African Startups' })
    expect(create).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledTimes(1)
    expect(tx.init).toHaveBeenCalledTimes(1)
    expect(tx.commit).toHaveBeenCalledTimes(1)
    expect(tx.rollback).not.toHaveBeenCalled()
  })

  it('repeating an identical creation returns the existing category without writing', async () => {
    const { req, create, update } = fixture()
    const result = await createCategory(req, {
      slug: 'technology', titleFr: 'Technologie', titleEn: 'Technology', confirm: true,
    })
    expect(result).toMatchObject({ id: 1, created: false, changed: false })
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects reused slugs with differing names and canonical setup bypass attempts', async () => {
    const { req, create } = fixture()
    await expect(createCategory(req, {
      slug: 'technology', titleFr: 'Autre rubrique', titleEn: 'Another', confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'category_slug_already_exists' })
    await expect(createCategory(req, {
      slug: 'business-finance', titleFr: 'Faux nom', titleEn: 'Wrong name', confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'canonical_rubric_requires_editorial_setup' })
    expect(create).not.toHaveBeenCalled()
  })

  it('renames both translations but preserves the original URL and references', async () => {
    const { req, rows, create, update, release } = fixture()
    const result = await renameCategory(req, {
      categoryId: 1, titleFr: 'Technologie ancienne', titleEn: 'Legacy Technology',
      expectedUpdatedAt: date, confirm: true,
    })
    expect(result).toMatchObject({ slug: 'technology', changed: true, created: false })
    expect(rows[0]).toMatchObject({
      titleFr: 'Technologie ancienne', titleEn: 'Legacy Technology', slug: 'technology',
    })
    expect(create).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledTimes(2)
    expect(tx.commit).toHaveBeenCalledTimes(1)
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('blocks stale edits, canonical rubric renames and concurrent edits', async () => {
    const { req, update } = fixture()
    await expect(renameCategory(req, {
      categoryId: 1, titleFr: 'Autre', titleEn: 'Other',
      expectedUpdatedAt: '2026-10-28T11:00:00.000Z', confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'stale_category_edit' })
    await expect(renameCategory(req, {
      categoryId: 7, titleFr: 'Autre', titleEn: 'Other', expectedUpdatedAt: date, confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'canonical_rubric_titles_defined_in_code' })
    expect(update).not.toHaveBeenCalled()
    const locked = fixture({ lock: false })
    await expect(renameCategory(locked.req, {
      categoryId: 1, titleFr: 'Autre', titleEn: 'Other', expectedUpdatedAt: date, confirm: true,
    })).rejects.toMatchObject({ status: 409, code: 'category_edit_busy_retry' })
  })

  it('rolls back the whole localized update when an English title cannot be saved', async () => {
    const { req } = fixture({ failEnglish: true })
    await expect(renameCategory(req, {
      categoryId: 1, titleFr: 'Un autre', titleEn: 'Another', expectedUpdatedAt: date, confirm: true,
    })).rejects.toThrow('English title write failed')
    expect(tx.commit).not.toHaveBeenCalled()
    expect(tx.rollback).toHaveBeenCalledTimes(1)
  })

  it('rejects unapproved writes and malformed slugs at the input boundary', () => {
    expect(operationSchema.safeParse({
      operation: 'create-category', slug: 'arabic--broken',
      titleFr: 'Une', titleEn: 'One', confirm: true,
    }).success).toBe(false)
    expect(operationSchema.safeParse({
      operation: 'create-category', slug: 'good-slug', titleFr: 'Une', titleEn: 'One',
    }).success).toBe(false)
    expect(operationSchema.safeParse({
      operation: 'rename-category', categoryId: 1, titleFr: 'Une',
      titleEn: 'One', expectedUpdatedAt: date,
    }).success).toBe(false)
  })
})
