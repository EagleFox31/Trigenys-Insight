// @vitest-environment node
import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import sharp from 'sharp'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { InsightClient, InsightAPIError } from '../../packages/insight-automation/src/index'
import { createInsightMCPServer } from '../../packages/insight-automation/src/mcp'
import { articleSchema, operationSchema } from '../../packages/insight-automation/src/schema'
import { editorialOSEndpoint } from '@/endpoints/editorialOS'
import { authorizedEditorialRequest, authorizedEditorialSession } from '@/automation/auth'
import { createAutomationContent } from '@/automation/content'

const token = 'automation-test-only-token'
const article = {
  idempotencyKey: 'test-article-1',
  ownerKey: 'trigenys',
  target: 'insight',
  locale: 'fr' as const,
  title: 'Une analyse',
  excerpt: 'Le résumé',
  body: '## Un titre\n\nUn **constat** et une [source](https://example.com).',
  authors: [1],
  categories: [2],
}
function persistence() {
  const posts: Record<string, unknown>[] = []
  const media: Record<string, unknown>[] = [
    { id: 3, filename: 'hero.webp', url: 'https://example.com/hero.webp' },
  ]
  const sources: Record<string, unknown>[] = []
  const tables: Record<string, Record<string, unknown>[]> = {
    posts,
    media,
    users: [{ id: 1, name: 'Editor', email: 'private@example.com', hash: 'secret' }],
    categories: [{ id: 2, title: 'Technologie', slug: 'technology' }],
    'research-sources': sources,
  }
  const find = vi.fn(
    async (args: {
      collection: string
      where?: Record<string, { equals?: unknown; in?: unknown[] }>
      locale?: string
    }) => {
      const docs = tables[args.collection].filter(
        (doc) =>
          !args.where ||
          Object.entries(args.where).every(([key, query]) =>
            query.in ? query.in.includes(doc[key]) : doc[key] === query.equals,
          ),
      )
      return { docs: docs.map((doc) => ({ ...doc })), totalDocs: docs.length }
    },
  )
  const create = vi.fn(
    async (args: {
      collection: string
      data: Record<string, unknown>
      file?: { name: string }
    }) => {
      const doc = {
        id: 10 + tables[args.collection].length,
        ...args.data,
        ...(args.file
          ? { filename: args.file.name, url: `https://example.com/${args.file.name}` }
          : {}),
      }
      tables[args.collection].push(doc)
      return { ...doc }
    },
  )
  const update = vi.fn(
    async (args: { collection: string; id: number; data: Record<string, unknown> }) => {
      const doc = tables[args.collection].find((doc) => doc.id === args.id)!
      Object.assign(doc, args.data)
      return { ...doc }
    },
  )
  return { posts, media, sources, payload: { find, create, update, logger: { error: vi.fn() } } }
}
function setup() {
  const db = persistence()
  const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const request = new Request('https://insight.example/api/editorial-os', init)
    const req = Object.assign(request, { payload: db.payload }) as unknown as PayloadRequest
    return editorialOSEndpoint.handler(req)
  }) as unknown as typeof fetch
  const client = new InsightClient({ baseURL: 'https://insight.example', token, fetch: fetcher })
  return { db, client, fetcher }
}

beforeEach(() => {
  vi.stubEnv('INSIGHT_PUBLISHING_TOKEN_SHA256', createHash('sha256').update(token).digest('hex'))
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('publishing API and SDK contract', () => {
  it('rejects missing, wrong and malformed credentials before accessing Payload', async () => {
    expect(authorizedEditorialRequest(null)).toBe(false)
    expect(authorizedEditorialRequest('Bearer wrong')).toBe(false)
    vi.stubEnv('INSIGHT_PUBLISHING_TOKEN_SHA256', 'bad-hash')
    expect(authorizedEditorialRequest(`Bearer ${token}`)).toBe(false)
    const response = await editorialOSEndpoint.handler(
      new Request('https://example.com', {
        method: 'POST',
        body: '{}',
      }) as unknown as PayloadRequest,
    )
    expect(response.status).toBe(401)
  })
  it('creates, revises, translates and publishes using the same document ID', async () => {
    const { db, client } = setup()
    const first = await client.createDraft({ ...article, heroImage: 3, featured: true })
    expect(first.status).toBe('DRAFT')
    expect(first.previewURL).toBeNull()
    expect(first.adminURL).toContain(`/posts/${first.id}`)
    const revised = await client.createDraft({ ...article, title: 'Révision' })
    const english = await client.createDraft({ ...article, locale: 'en', title: 'English version' })
    const published = await client.publish(article)
    expect([revised.id, english.id, published.id]).toEqual([first.id, first.id, first.id])
    expect(db.posts).toHaveLength(1)
    expect(db.posts[0].heroImage).toBe(3)
    expect(db.posts[0].featured).toBe(true)
    expect(published.url).toBe(`/fr/posts/${first.slug}`)
    expect((await client.getPost(article.idempotencyKey)).post._status).toBe('published')
  })
  it('updates only the excerpt and SEO description while preserving the published article', async () => {
    const { db, client } = setup()
    const published = await client.publish({
      ...article,
      heroImage: 3,
      metadata: { seo: { title: 'Original SEO', description: 'Original description', image: 3 } },
    })
    const before = structuredClone(db.posts[0])
    db.posts[0].updatedAt = '2026-10-14T08:00:00.000Z'
    const result = await client.updatePost({
      idempotencyKey: article.idempotencyKey,
      excerpt: 'Un résumé concret.',
      seoDescription: 'Une description concrète.',
      expectedUpdatedAt: '2026-10-14T08:00:00.000Z',
    })
    expect(result.id).toBe(published.id)
    expect(result.status).toBe('PUBLISHED')
    expect(db.posts).toHaveLength(1)
    expect(db.posts[0].excerpt).toBe('Un résumé concret.')
    expect(db.posts[0].content).toEqual(before.content)
    expect(db.posts[0].heroImage).toBe(3)
    expect(db.posts[0].categories).toEqual(before.categories)
    expect(db.posts[0].meta).toEqual({
      title: 'Original SEO',
      description: 'Une description concrète.',
      image: 3,
    })
    await expect(
      client.updatePost({ idempotencyKey: 'missing', excerpt: 'A summary' }),
    ).rejects.toMatchObject({ status: 404 })
    await expect(
      client.updatePost({ idempotencyKey: article.idempotencyKey }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      client.updatePost({
        idempotencyKey: article.idempotencyKey,
        excerpt: 'Outdated',
        expectedUpdatedAt: '2026-10-13T08:00:00.000Z',
      }),
    ).rejects.toMatchObject({ status: 409 })
    expect(db.posts[0].excerpt).toBe('Un résumé concret.')
  })
  it('updates categories of an existing CMS draft by ID, validates references and keeps its content', async () => {
    const { db, client } = setup()
    db.posts.push({ id: 8, slug: 'existing-cms-article', _status: 'draft', categories: [5], title: 'Whisp', content: { root: { children: [] } }, heroImage: 3 })
    const before = structuredClone(db.posts[0])
    const result = await client.updatePost({ postId: 8, categories: [2, 2] })
    expect(result).toMatchObject({ id: 8, status: 'DRAFT', slug: 'existing-cms-article' })
    expect(db.posts[0]).toEqual({ ...before, categories: [2] })
    expect((await client.getPostById(8)).post.id).toBe(8)
    await expect(client.updatePost({ postId: 8, categories: [999] })).rejects.toMatchObject({ status: 422 })
    await expect(client.updatePost({ postId: 8, categories: [] })).rejects.toMatchObject({ name: 'ZodError' })
    await expect(client.updatePost({ categories: [2] })).rejects.toMatchObject({ status: 400 })
    await expect(client.updatePost({ postId: 8, idempotencyKey: 'ambiguous', categories: [2] })).rejects.toMatchObject({ status: 400 })
    expect(db.posts[0].categories).toEqual([2])
    await client.updatePost({ postId: 8, categories: [2], status: 'PUBLISHED' })
    expect(db.posts[0]._status).toBe('published')
    expect(db.posts[0].content).toEqual(before.content)
  })
  it('retains the old text-only request format and chooses defaults only on creation', async () => {
    const { db, client } = setup()
    const { authors: _a, categories: _c, ...legacy } = article
    await client.createDraft({ ...legacy, excerpt: null, metadata: { trace: 'legacy' } })
    expect(db.posts[0].authors).toEqual([1])
    expect(db.posts[0].categories).toEqual([2])
  })
  it('preserves multiple charts, images, headings, links and emphasis', async () => {
    const { db, client } = setup()
    const chart = {
      title: 'Comparaison',
      description: 'Deux valeurs.',
      sourceLabel: 'Données de test',
      sourceUrl: 'https://example.com',
      metrics: [
        {
          label: 'Valeur',
          unit: '%',
          precision: 1,
          points: [
            { label: 'A', value: 3 },
            { label: 'B', value: 5 },
          ],
        },
      ],
    }
    const input = {
      ...article,
      body: article.body + '\n\n[[CHART:first]]\n\n[[IMAGE:photo]]\n\n[[CHART:second]]',
      charts: [
        { ...chart, marker: '[[CHART:first]]' },
        { ...chart, marker: '[[CHART:second]]' },
      ],
      images: [{ marker: '[[IMAGE:photo]]', media: 3 }],
    }
    await client.createDraft(input)
    const json = JSON.stringify(db.posts[0].content)
    expect(json.match(/"blockType":"chart"/g)).toHaveLength(2)
    expect(json).toContain('"blockType":"mediaBlock"')
    expect(json).toContain('"type":"heading"')
    expect(json).toContain('"type":"link"')
    expect(json).toContain('"format":1')
  })
  it('rejects missing or duplicated markers and invalid relations before writes', async () => {
    const { db, client } = setup()
    await expect(client.createDraft({ ...article, body: '[[IMAGE:missing]]' })).rejects.toThrow(
      'Missing definition',
    )
    expect(() =>
      createAutomationContent({
        ...article,
        body: '[[IMAGE:a]]\n\n[[IMAGE:a]]',
        images: [{ marker: '[[IMAGE:a]]', media: 3 }],
      }),
    ).toThrow('exactly once')
    await expect(client.createDraft({ ...article, heroImage: 999 })).rejects.toMatchObject({
      status: 422,
    })
    expect(db.payload.create).not.toHaveBeenCalled()
  })
  it('uploads a verified image, reuses it on retry and rejects forged image bytes', async () => {
    const { db, client } = setup()
    const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } })
      .png()
      .toBuffer()
    const input = {
      filename: 'test.png',
      mimeType: 'image/png' as const,
      alt: 'Une image de test',
      dataBase64: image.toString('base64'),
    }
    const first = await client.uploadMedia(input)
    const second = await client.uploadMedia(input)
    expect(second.id).toBe(first.id)
    expect(second.reused).toBe(true)
    expect(db.media).toHaveLength(2)
    await expect(
      client.uploadMedia({ ...input, dataBase64: Buffer.from('not an image').toString('base64') }),
    ).rejects.toMatchObject({ status: 422 })
    await expect(client.uploadMedia({ ...input, mimeType: 'image/jpeg' })).rejects.toMatchObject({
      status: 422,
    })
  })
  it('returns only public author identifiers and supports source upserts', async () => {
    const { client, db } = setup()
    const authors = await client.listAuthors()
    expect(authors.docs).toEqual([{ id: 1, name: 'Editor' }])
    expect((await client.listCategories()).docs[0].id).toBe(2)
    const source = {
      title: 'Primary source',
      url: 'https://example.com/source',
      accessedAt: '2026-10-14T07:00:00Z',
    }
    const first = await client.upsertSource(source)
    const second = await client.upsertSource({ ...source, title: 'Updated source' })
    expect(first.id).toBe(second.id)
    expect(db.sources).toHaveLength(1)
    await client.createDraft({ ...article, sources: [first.id] })
    expect(db.posts[0].sources).toEqual([first.id])
  })
  it('rejects invalid JSON, oversized bodies and unknown properties on the server', async () => {
    const db = persistence()
    const invoke = (body: string, headers = {}) =>
      editorialOSEndpoint.handler(
        Object.assign(
          new Request('https://example.com', {
            method: 'POST',
            body,
            headers: { Authorization: `Bearer ${token}`, ...headers },
          }),
          { payload: db.payload },
        ) as unknown as PayloadRequest,
      )
    expect((await invoke('not json')).status).toBe(400)
    expect((await invoke('{}', { 'content-length': '4400001' })).status).toBe(413)
    expect(
      (await invoke(JSON.stringify({ ...article, operation: 'draft', arbitrary: true }))).status,
    ).toBe(400)
    expect(db.payload.create).not.toHaveBeenCalled()
  })
  it('does not leak response bodies or follow redirects with the publishing token', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      Response.json({ error: 'unauthorized', token: 'secret' }, { status: 401 }),
    )
    const client = new InsightClient({ baseURL: 'https://example.com', token, fetch: fetcher })
    await expect(client.listAuthors()).rejects.toThrow(InsightAPIError)
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ redirect: 'error' })
    expect(() => new InsightClient({ baseURL: 'http://public.example', token })).toThrow('HTTPS')
  })
  it('validates chart constraints and does not accept arbitrary Lexical or HTML', () => {
    expect(articleSchema.safeParse({ ...article, content: { root: {} } }).success).toBe(false)
    expect(operationSchema.safeParse({ ...article, operation: 'delete' }).success).toBe(false)
  })
})

describe('editorial session authentication', () => {
  it('requires an authenticated editor and the canonical Origin', async () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://insight.example')
    const user = { id: 1 } as PayloadRequest['user']
    expect(
      authorizedEditorialSession({
        user,
        headers: new Headers({ Origin: 'https://insight.example' }),
      }),
    ).toBe(true)
    expect(
      authorizedEditorialSession({
        user,
        headers: new Headers({ Origin: 'https://other.example' }),
      }),
    ).toBe(false)
    expect(
      authorizedEditorialSession({
        user: null,
        headers: new Headers({ Origin: 'https://insight.example' }),
      }),
    ).toBe(false)
    expect(authorizedEditorialSession({ user, headers: new Headers() })).toBe(false)
    const { db } = setup()
    const req = Object.assign(
      new Request('https://insight.example/api/editorial-os', {
        method: 'POST',
        headers: { Origin: 'https://insight.example' },
        body: JSON.stringify({ ...article, operation: 'draft' }),
      }),
      { user, payload: db.payload },
    ) as unknown as PayloadRequest
    expect((await editorialOSEndpoint.handler(req)).status).toBe(200)
  })
  it('binds the native browser fetch to its global context', async () => {
    vi.stubGlobal('fetch', function (this: unknown) {
      if (this !== globalThis) throw new TypeError('Illegal invocation')
      return Promise.resolve(Response.json({ ok: true, docs: [] }))
    })
    const client = new InsightClient({ baseURL: 'https://insight.example', token })
    await expect(client.listAuthors()).resolves.toMatchObject({ ok: true })
  })
  it('keeps session cookies same-origin and never sends a token from the browser', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://insight.example' } })
    const fetcher = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      Response.json({ ok: true, docs: [] }),
    )
    const client = new InsightClient({
      baseURL: 'https://insight.example',
      session: true,
      fetch: fetcher,
    })
    await client.listAuthors()
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ credentials: 'same-origin' })
    expect(fetcher.mock.calls[0]?.[1]?.headers).not.toHaveProperty('Authorization')
    expect(() => new InsightClient({ baseURL: 'https://other.example', session: true })).toThrow(
      'same-origin',
    )
  })
})

describe('MCP protocol', () => {
  it('discovers tools, calls the SDK and propagates failures as MCP errors', async () => {
    const { client: sdk, db } = setup()
    const server = createInsightMCPServer(sdk)
    const client = new Client({ name: 'test', version: '1.0.0' })
    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    await client.connect(clientTransport)
    try {
      const tools = await client.listTools()
      expect(tools.tools.map((tool) => tool.name)).toContain('insight_publish')
      const result = await client.callTool({ name: 'insight_create_draft', arguments: article })
      expect(result.isError).not.toBe(true)
      expect(db.posts).toHaveLength(1)
      const failure = await client.callTool({
        name: 'insight_get_post',
        arguments: { idempotencyKey: 'missing' },
      })
      expect(failure.isError).toBe(true)
    } finally {
      await client.close()
      await server.close()
    }
  })
  it('serves a stateless Streamable HTTP initialize and tools/list on fresh server instances', async () => {
    const backend = { request: vi.fn(async () => ({ ok: true })) }
    async function post(body: unknown) {
      const server = createInsightMCPServer(backend)
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      })
      await server.connect(transport)
      try {
        const response = await transport.handleRequest(
          new Request('https://example.com/api/mcp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json, text/event-stream',
              'MCP-Protocol-Version': '2025-11-25',
            },
            body: JSON.stringify(body),
          }),
        )
        return { status: response.status, json: await response.json() }
      } finally {
        await server.close()
      }
    }
    const init = await post({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'test', version: '1' },
      },
    })
    expect(init.status).toBe(200)
    expect(init.json.result.serverInfo.name).toBe('trigenys-insight')
    const tools = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    expect(tools.status).toBe(200)
    expect(tools.json.result.tools).toHaveLength(8)
  })
})
