// @vitest-environment node
import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest, Where } from 'payload'
import type { Post } from '@/payload-types'
import { InsightClient } from '../../packages/insight-automation/src/index'
import { createAutomationContent } from '@/automation/content'
import { editorialOSEndpoint } from '@/endpoints/editorialOS'
import { operationScopes } from '@/automation/oauth/core'

type RecordData = Record<string, unknown>
const stamp = '2026-01-01T00:00:00.000Z'
const token = 'editorial-management-unit-test'
const body = (text: string) => createAutomationContent({ body: text })
const base = (id: number, title: string, status = 'draft'): RecordData => ({
  id,
  slug: `article-${id}`,
  title,
  excerpt: 'Un résumé complet.',
  content: body(`## Une analyse\n\nLe contenu original ${id}.`),
  _status: status,
  updatedAt: stamp,
  createdAt: stamp,
  publishedAt: status === 'published' ? '2026-01-03T00:00:00.000Z' : null,
  heroImage: 3,
  authors: [1],
  categories: [2],
  sources: [4],
  relatedPosts: [],
  meta: { title: 'Un titre SEO', description: 'Une description SEO explicite.', image: 3 },
})
function fixture() {
  const locales: Record<'fr' | 'en', RecordData[]> = {
    fr: [
      base(1, 'Publié', 'published'),
      { ...base(2, 'Sans couverture'), heroImage: null },
      { ...base(3, 'Autre catégorie'), categories: [7] },
      base(4, 'Révision en attente'),
    ],
    en: [
      base(1, 'Published', 'published'),
      { ...base(2, ''), content: null, excerpt: null, heroImage: null },
      { ...base(3, 'Another category'), categories: [7] },
      base(4, 'Pending revision'),
    ],
  }
  const live = new Map([
    [1, 'published'],
    [2, 'draft'],
    [3, 'draft'],
    [4, 'published'],
  ])
  const schedules = [
    {
      id: 20,
      input: { doc: { relationTo: 'posts', value: 1 } },
      waitUntil: '2030-01-01T08:00:00.000Z',
    },
  ]
  const tables: Record<string, RecordData[]> = {
    media: [
      { id: 3, alt: 'Une couverture', mimeType: 'image/webp' },
      { id: 8, alt: '', mimeType: 'image/png' },
    ],
    'research-sources': [{ id: 4, title: 'Source', url: 'https://example.com/source' }],
    users: [{ id: 1, name: 'Author', email: 'hidden@example.com', hash: 'never-return-this' }],
    categories: [{ id: 2 }, { id: 7 }],
  }
  function matches(doc: RecordData, where: Where = {}): boolean {
    return Object.entries(where).every(([key, condition]) => {
      if (key === 'and' && Array.isArray(condition))
        return condition.every((value) => matches(doc, value))
      if (key === 'or' && Array.isArray(condition))
        return condition.some((value) => matches(doc, value))
      if (Array.isArray(condition)) return false
      const value = key
        .split('.')
        .reduce<unknown>(
          (value, part) =>
            value && typeof value === 'object' ? (value as RecordData)[part] : undefined,
          doc,
        )
      if ('equals' in condition)
        return Array.isArray(value) ? value.includes(condition.equals) : value === condition.equals
      if ('in' in condition) {
        const values = condition.in as unknown[]
        return Array.isArray(value) ? value.some((v) => values.includes(v)) : values.includes(value)
      }
      if ('exists' in condition) return (value !== null && value !== undefined) === condition.exists
      if ('like' in condition)
        return String(value).toLowerCase().includes(String(condition.like).toLowerCase())
      if ('greater_than_equal' in condition)
        return value !== null && String(value) >= String(condition.greater_than_equal)
      if ('less_than_equal' in condition)
        return value !== null && String(value) <= String(condition.less_than_equal)
      return false
    })
  }
  type FindArgs = {
    collection: string
    where?: Where
    draft?: boolean
    locale?: 'fr' | 'en'
    page?: number
    limit?: number
    pagination?: boolean
    sort?: string | string[]
    fallbackLocale?: boolean
  }
  let locked = false
  const payload = {
    find: vi.fn(async (args: FindArgs) => {
      let docs =
        args.collection === 'posts'
          ? locales[args.locale ?? 'fr'].map((doc) => ({
              ...doc,
              ...(args.draft === false ? { _status: live.get(doc.id as number) } : {}),
            }))
          : (tables[args.collection] ?? [])
      docs = docs.filter((doc) => matches(doc, args.where))
      const sorts = Array.isArray(args.sort) ? args.sort : [args.sort ?? 'id']
      docs.sort((a, b) => {
        for (const sort of sorts) {
          const key = sort.replace(/^-/, ''),
            direction = sort.startsWith('-') ? -1 : 1
          if (a[key] !== b[key])
            return (
              String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true }) * direction
            )
        }
        return 0
      })
      const totalDocs = docs.length,
        limit = args.limit ?? 25,
        page = args.page ?? 1
      if (args.pagination !== false) docs = docs.slice((page - 1) * limit, page * limit)
      return {
        docs: structuredClone(docs),
        totalDocs,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(totalDocs / limit)),
        hasNextPage: page * limit < totalDocs,
      }
    }),
    update: vi.fn(
      async (args: { id: number; data: RecordData; locale: 'fr' | 'en'; draft: boolean }) => {
        const post = locales[args.locale].find((post) => post.id === args.id)!
        Object.assign(post, structuredClone(args.data), { updatedAt: new Date().toISOString() })
        if (!args.draft) live.set(args.id, String(post._status))
        return structuredClone(post)
      },
    ),
    create: vi.fn(),
    delete: vi.fn(),
    jobs: { queue: vi.fn() },
    logger: { error: vi.fn() },
    db: {
      pool: {
        connect: vi.fn(async () => {
          let owns = false
          return {
            query: vi.fn(async (sql: string) => {
              if (sql.includes('pg_try_advisory_xact_lock')) {
                owns = !locked
                if (owns) locked = true
                return { rows: [{ locked: owns }] }
              }
              if (sql === 'COMMIT' || sql === 'ROLLBACK') {
                if (owns) locked = false
              }
              return { rows: [] }
            }),
            release: vi.fn(),
          }
        }),
      },
    },
  }
  const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) =>
    editorialOSEndpoint.handler(
      Object.assign(new Request('https://insight.example/api/editorial-os', init), {
        payload,
      }) as unknown as PayloadRequest,
    ),
  ) as unknown as typeof fetch
  const client = new InsightClient({ baseURL: 'https://insight.example', token, fetch: fetcher })
  return { client, payload, locales, tables, live, schedules, fetcher }
}
beforeEach(() =>
  vi.stubEnv('INSIGHT_PUBLISHING_TOKEN_SHA256', createHash('sha256').update(token).digest('hex')),
)
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('article listing', () => {
  it('filters, paginates and counts exactly while distinguishing latest draft from the live publication', async () => {
    const { client } = fixture()
    const all = await client.listPosts({ sort: 'id', limit: 2 })
    expect(all.docs.map((post) => post.id)).toEqual([1, 2])
    expect(all).toMatchObject({ totalDocs: 4, hasNextPage: true, totalPages: 2 })
    expect(
      (await client.listPosts({ page: 2, limit: 2, sort: 'id' })).docs.map((post) => post.id),
    ).toEqual([3, 4])
    const missing = await client.listPosts({ status: 'DRAFT', heroImage: 'missing', categoryId: 2 })
    expect(missing.totalDocs).toBe(1)
    expect(missing.docs[0].id).toBe(2)
    expect((await client.listPosts({ heroImage: 'present' })).totalDocs).toBe(3)
    expect((await client.listPosts({ search: 'Sans' })).docs.map((post) => post.id)).toEqual([2])
    expect((await client.listPosts({ categoryId: 7 })).docs.map((post) => post.id)).toEqual([3])
    const revision = (await client.listPosts({ status: 'DRAFT' })).docs.find(
      (post) => post.id === 4,
    )
    expect(revision).toMatchObject({ status: 'DRAFT', isPublic: true })
    expect(JSON.stringify(all)).not.toMatch(/content|hidden@example|never-return-this/)
  })
  it('does not substitute French for an absent English version and validates bounds', async () => {
    const { client } = fixture()
    const en = await client.listPosts({ locale: 'en', sort: 'id' })
    expect(en.docs.find((post) => post.id === 2)).toMatchObject({
      title: null,
      translationPresent: false,
      hasContent: false,
    })
    expect((await client.listPosts({ publishedAfter: '2026-01-02T00:00:00Z' })).totalDocs).toBe(1)
    await expect(
      client.listPosts({
        publishedAfter: '2027-01-01T00:00:00Z',
        publishedBefore: '2026-01-01T00:00:00Z',
      }),
    ).rejects.toMatchObject({ code: 'invalid_publication_date_range' })
    await expect(client.listPosts({ limit: 101 })).rejects.toMatchObject({ name: 'ZodError' })
    await expect(client.listPosts({ page: 0 })).rejects.toMatchObject({ name: 'ZodError' })
  })
})

describe('full article content updates', () => {
  it('updates any article by ID and keeps published status, other-language content, metadata, slug and schedule', async () => {
    const { client, locales, payload, schedules, live } = fixture()
    const en = structuredClone(locales.en[0]),
      original = structuredClone(locales.fr[0]),
      queued = structuredClone(schedules)
    const updated = await client.updateContent({
      postId: 1,
      expectedUpdatedAt: stamp,
      body: '## Nouvelle analyse\n\nUn texte corrigé.',
    })
    expect(updated).toMatchObject({ id: 1, slug: 'article-1', status: 'PUBLISHED' })
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ draft: false, locale: 'fr', fallbackLocale: false }),
    )
    expect(locales.fr[0]).toMatchObject({
      slug: original.slug,
      meta: original.meta,
      heroImage: 3,
      categories: [2],
      authors: [1],
    })
    expect(locales.en[0]).toEqual(en)
    expect(live.get(1)).toBe('published')
    expect(schedules).toEqual(queued)
    expect(payload.delete).not.toHaveBeenCalled()
    expect(payload.create).not.toHaveBeenCalled()
  })
  it('updates a pending draft without publishing its revision or the live document', async () => {
    const { client, payload, live } = fixture()
    const updated = await client.updateContent({
      postId: 4,
      expectedUpdatedAt: stamp,
      body: 'Un nouveau brouillon.',
    })
    expect(updated.status).toBe('DRAFT')
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ draft: true, data: expect.objectContaining({ _status: 'draft' }) }),
    )
    expect(live.get(4)).toBe('published')
  })
  it('preserves rich embedded blocks by marker and refuses silent removal or an unknown block', async () => {
    const { client, locales, payload } = fixture()
    const diagram = {
      type: 'block',
      version: 2,
      format: '',
      fields: {
        id: 'diagram-1',
        blockType: 'moneyFlow',
        title: 'Un graphe interactif',
        nodeImages: ['one.svg'],
      },
    }
    const doc = locales.fr[0].content as Post['content']
    doc.root.children.push(diagram)
    await expect(
      client.updateContent({ postId: 1, expectedUpdatedAt: stamp, body: 'Texte sans le graphe.' }),
    ).rejects.toMatchObject({ code: 'embedded_blocks_require_explicit_replacement' })
    await expect(
      client.updateContent({
        postId: 1,
        expectedUpdatedAt: stamp,
        body: '[[BLOCK:keep]]',
        retainedBlocks: [{ marker: '[[BLOCK:keep]]', blockId: 'unknown' }],
      }),
    ).rejects.toMatchObject({ code: 'retained_block_not_found' })
    expect(payload.update).not.toHaveBeenCalled()
    await client.updateContent({
      postId: 1,
      expectedUpdatedAt: stamp,
      body: 'Une introduction corrigée.\n\n[[BLOCK:keep]]',
      retainedBlocks: [{ marker: '[[BLOCK:keep]]', blockId: 'diagram-1' }],
    })
    expect((locales.fr[0].content as Post['content']).root.children[1]).toEqual(diagram)
  })
  it('validates media and markers before replacing blocks, and supports an explicit cover removal', async () => {
    const { client, locales, payload } = fixture()
    await expect(
      client.updateContent({ postId: 1, expectedUpdatedAt: stamp, body: '[[IMAGE:missing]]' }),
    ).rejects.toMatchObject({ code: 'invalid_content_markers' })
    await expect(
      client.updateContent({
        postId: 1,
        expectedUpdatedAt: stamp,
        body: '[[IMAGE:new]]',
        images: [{ marker: '[[IMAGE:new]]', media: 999 }],
      }),
    ).rejects.toMatchObject({ code: 'invalid_media_reference' })
    await expect(
      client.updateContent({ postId: 1, expectedUpdatedAt: stamp, body: '[[BLOCK:missing]]' }),
    ).rejects.toMatchObject({ code: 'missing_retained_block_definition' })
    expect(payload.update).not.toHaveBeenCalled()
    await client.updateContent({
      postId: 1,
      expectedUpdatedAt: stamp,
      body: 'Texte.\n\n[[IMAGE:new]]',
      images: [{ marker: '[[IMAGE:new]]', media: 8 }],
      heroImage: null,
      sources: [],
      relatedPosts: [],
      metadata: { seo: { description: 'Nouvelle description.' } },
    })
    expect(locales.fr[0]).toMatchObject({
      heroImage: null,
      sources: [],
      relatedPosts: [],
      meta: { title: 'Un titre SEO', description: 'Nouvelle description.', image: 3 },
    })
    expect((locales.fr[0].content as Post['content']).root.children[1]).toMatchObject({
      fields: { blockType: 'mediaBlock', media: 8 },
    })
  })
  it('requires a fresh version, rejects raw JSON/status fields and never creates an absent article', async () => {
    const { client, payload } = fixture()
    await expect(
      client.updateContent({
        postId: 1,
        expectedUpdatedAt: '2020-01-01T00:00:00Z',
        body: 'Une correction.',
      }),
    ).rejects.toMatchObject({ code: 'stale_update', status: 409 })
    await expect(
      client.updateContent({ postId: 999, expectedUpdatedAt: stamp, body: 'Une correction.' }),
    ).rejects.toMatchObject({ code: 'post_not_found' })
    await expect(
      client.request({
        operation: 'update-content',
        postId: 1,
        expectedUpdatedAt: stamp,
        body: 'Une correction.',
        status: 'DRAFT',
      } as never),
    ).rejects.toMatchObject({ name: 'ZodError' })
    await expect(
      client.request({
        operation: 'update-content',
        postId: 1,
        expectedUpdatedAt: stamp,
        body: 'Une correction.',
        content: { root: {} },
      } as never),
    ).rejects.toMatchObject({ name: 'ZodError' })
    expect(payload.update).not.toHaveBeenCalled()
    expect(payload.create).not.toHaveBeenCalled()
  })
})

describe('read-only editorial audit', () => {
  it('finds translation, media, SEO, source and internal-link problems without HTTP requests or writes', async () => {
    const { client, locales, payload } = fixture()
    locales.fr[0].meta = { title: '', description: '' }
    locales.fr[0].sources = [999]
    locales.fr[0].heroImage = 8
    locales.fr[0].relatedPosts = [2, 999, 1]
    const unresolvedContent = body('Du contenu et une [source](https://example.com).')
    unresolvedContent.root.children.push({
      type: 'paragraph',
      version: 1,
      children: [{ type: 'text', version: 1, text: '[[CHART:unresolved]]' }],
    })
    locales.fr[0].content = unresolvedContent
    const fetch = vi.fn(() => {
      throw new Error('Audit must not fetch links')
    })
    vi.stubGlobal('fetch', fetch)
    const result = await client.auditPosts({ postIds: [1, 2], sort: 'id' })
    expect(result).toMatchObject({
      externalAvailabilityChecked: false,
      factsVerified: false,
      editorialApprovalRequired: true,
      scope: 'current_page',
      totalDocs: 2,
    })
    const issues = result.docs.flatMap((doc) => doc.issues.map((issue) => issue.code))
    expect(issues).toEqual(
      expect.arrayContaining([
        'translation_title_missing',
        'translation_body_missing',
        'hero_image_missing',
        'image_alt_missing',
        'seo_title_missing',
        'source_reference_missing',
        'internal_post_not_public',
        'internal_post_missing',
        'self_related_or_linked_post',
        'unresolved_content_marker',
      ]),
    )
    expect(result.summary.articlesWithErrors).toBe(2)
    expect(result.docs[1].locales.en).toMatchObject({ hasContent: false, hasTitle: false })
    expect(fetch).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.jobs.queue).not.toHaveBeenCalled()
  })
  it('checks CMS targets in textual and relationship links and rejects unsafe protocols', async () => {
    const { client, locales } = fixture()
    const doc = body('Des liens à vérifier.')
    doc.root.children.push(
      {
        type: 'link',
        version: 1,
        fields: { url: 'https://insight.trigenys.com/fr/posts/not-found' },
        children: [],
      },
      {
        type: 'link',
        version: 1,
        fields: { linkType: 'internal', doc: { relationTo: 'posts', value: 2 } },
        children: [],
      },
      { type: 'link', version: 1, fields: { url: 'javascript:alert(1)' }, children: [] },
    )
    locales.fr[0].content = doc
    const result = await client.auditPosts({ postIds: [1], checks: ['links'] })
    expect(result.docs[0].issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['internal_post_missing', 'internal_post_not_public', 'unsafe_link']),
    )
  })
  it('keeps counts scoped to each page and reports technical success without editorial approval', async () => {
    const { client } = fixture()
    const first = await client.auditPosts({ checks: ['structure'], sort: 'id', limit: 1 })
    expect(first).toMatchObject({ totalDocs: 4, hasNextPage: true, summary: { scanned: 1 } })
    expect(first.docs[0].passesAutomatedChecks).toBe(true)
    expect(first.editorialApprovalRequired).toBe(true)
    const second = await client.auditPosts({ checks: ['structure'], sort: 'id', limit: 1, page: 2 })
    expect(second.docs[0].id).toBe(2)
    expect(second.docs[0].issues.some((issue) => issue.code === 'translation_body_missing')).toBe(
      false,
    )
    await expect(client.auditPosts({ limit: 51 })).rejects.toMatchObject({ name: 'ZodError' })
  })
})

it('uses read-only scopes for inventory/audit and publication permission for a potentially live body edit', () => {
  expect(operationScopes({ operation: 'list-posts' })).toEqual(['editorial:read'])
  expect(operationScopes({ operation: 'audit-posts' })).toEqual(['editorial:read'])
  expect(operationScopes({ operation: 'update-content' })).toEqual([
    'editorial:write',
    'editorial:publish',
  ])
})
