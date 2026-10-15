// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import type { Post } from '@/payload-types'
import { BufferAPIError, BufferClient, type BufferChannel } from '@/integrations/buffer/client'
import {
  bootstrapChannel,
  executeBufferOperation,
  processBufferOutbox,
  socialRequest,
} from '@/integrations/buffer/service'
import { operationScopes } from '@/automation/oauth/core'
import { operationSchema } from '../../packages/insight-automation/src/schema'

const channel: BufferChannel = {
  id: 'channel-1',
  name: 'Trigenys Insight',
  service: 'linkedin',
  organizationId: 'org-1',
}
const text = 'Public article\nhttps://insight.trigenys.com/fr/posts/public'
const remote = { id: 'buffer-1', channelId: channel.id, text, status: 'draft' }
const post = {
  id: 1,
  title: 'Public article',
  excerpt: 'Public summary',
  slug: 'public',
  _status: 'published',
} as Post
function fixture(state = 'pending-draft', remoteId: string | null = null) {
  const row = {
    id: 'b4f49e8e-7c40-4c27-9f7d-74cff104c502',
    post_id: 1,
    state,
    remote_post_id: remoteId,
    request: { postId: 1, locale: 'fr', channel, text },
    updated_at: new Date('2026-01-01T00:00:00Z'),
  }
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    if (sql.includes('SELECT * FROM insight_social_exports')) return { rows: [row] }
    if (sql.includes('SET state=$2')) {
      row.state = values[1] as string
      return { rows: [row] }
    }
    return { rows: [] }
  })
  const lock = { query: vi.fn(async () => ({ rows: [{ locked: true }] })), release: vi.fn() }
  const find = vi.fn(async () => ({ docs: [post] }))
  const req = {
    payload: { find, db: { pool: { query, connect: vi.fn(async () => lock) } } },
  } as unknown as PayloadRequest
  const client = {
    findMatching: vi.fn(async () => null),
    createDraft: vi.fn(async () => remote),
    post: vi.fn(async () => remote),
    schedule: vi.fn(),
    cancel: vi.fn(),
  } as unknown as BufferClient
  return { row, query, lock, find, req, client }
}
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Buffer API boundary', () => {
  it('creates only a draft with public image, without any date or publish-now action', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ data: { createPost: { __typename: 'PostActionSuccess', post: remote } } }),
    )
    const client = new BufferClient('test-secret', fetcher)
    expect(
      await client.createDraft(channel.id, text, 'https://insight.trigenys.com/media/a.jpg'),
    ).toEqual(remote)
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.buffer.com')
    expect(options.redirect).toBe('manual')
    const input = JSON.parse(options.body as string).variables.input
    expect(input).toMatchObject({
      saveToDraft: true,
      needsApproval: false,
      mode: 'addToQueue',
      assets: [{ image: { url: 'https://insight.trigenys.com/media/a.jpg' } }],
    })
    expect(input.dueAt).toBeUndefined()
  })
  it('sanitizes provider errors and marks an unknown mutation outcome', async () => {
    const client = new BufferClient(
      'test-secret',
      vi.fn(async () =>
        Response.json({ errors: [{ message: 'test-secret raw provider details' }] }),
      ),
    )
    const error = await client.createDraft(channel.id, text).catch((e) => e)
    expect(error).toBeInstanceOf(BufferAPIError)
    expect(error.message).toBe('buffer_graphql_error')
    expect(error.ambiguous).toBe(true)
    expect(JSON.stringify(error)).not.toContain('test-secret')
  })
  it('retrieves channels from actual account organizations', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ data: { account: { organizations: [{ id: 'org-1' }] } } }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: { channels: [{ id: channel.id, name: channel.name, service: channel.service }] },
        }),
      )
    expect(await new BufferClient('test-secret', fetcher).channels()).toEqual([channel])
    expect(JSON.parse(fetcher.mock.calls[1][1].body).variables).toEqual({
      input: { organizationId: 'org-1' },
    })
  })
  it('never follows a provider redirect with the credential', async () => {
    const fetcher = vi.fn(
      async () => new Response(null, { status: 307, headers: { Location: 'https://example.org' } }),
    )
    await expect(new BufferClient('test-secret', fetcher).channels()).rejects.toMatchObject({
      code: 'buffer_http_error',
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('social draft source and selection', () => {
  it('requires a unique connected Trigenys channel', () => {
    expect(bootstrapChannel([channel])).toEqual(channel)
    expect(bootstrapChannel([{ ...channel, name: 'Personal account' }])).toBeNull()
    expect(
      bootstrapChannel([
        { ...channel, id: 'a', name: 'Trigenys A' },
        { ...channel, id: 'b', name: 'Trigenys B' },
      ]),
    ).toBeNull()
  })
  it('uses the supplied public snapshot, locale and UTM link', async () => {
    const request = await socialRequest({} as PayloadRequest, post, 'en', channel)
    expect(request.text).toContain('Public summary')
    expect(request.sourceURL).toContain('/en/posts/public?utm_source=linkedin')
    expect(request.sourceURL).toContain('utm_campaign=insight-post-1')
  })
  it('rejects private or untrusted cover URLs', async () => {
    const req = {
      payload: { findByID: vi.fn(async () => ({ url: 'http://127.0.0.1/private' })) },
    } as unknown as PayloadRequest
    await expect(
      socialRequest(req, { ...post, heroImage: 4 }, 'fr', channel),
    ).rejects.toMatchObject({ code: 'social_image_url_not_supported' })
  })
  it('requires publishing scope for scheduling and cancellation, and a timezone', () => {
    expect(operationScopes({ operation: 'buffer-create-draft' })).toEqual(['editorial:write'])
    for (const operation of ['buffer-schedule-post', 'buffer-cancel-schedule'])
      expect(operationScopes({ operation })).toContain('editorial:publish')
    expect(
      operationSchema.safeParse({
        operation: 'buffer-schedule-post',
        exportId: 'b4f49e8e-7c40-4c27-9f7d-74cff104c502',
        expectedUpdatedAt: '2026-01-01T00:00:00Z',
        publishAt: '2026-10-16T10:00:00',
      }).success,
    ).toBe(false)
  })
})

describe('durable social delivery', () => {
  it('creates and records a draft, using only the published CMS snapshot', async () => {
    vi.stubEnv('BUFFER_API_KEY', 'test-secret')
    const f = fixture()
    expect(await processBufferOutbox(f.req, f.client)).toMatchObject({
      processed: 1,
      state: 'draft',
    })
    expect(f.find).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: false,
        fallbackLocale: false,
        where: { and: [{ id: { equals: 1 } }, { _status: { equals: 'published' } }] },
      }),
    )
    expect(f.client.schedule).not.toHaveBeenCalled()
    expect(f.client.cancel).not.toHaveBeenCalled()
    expect(f.query).toHaveBeenCalledWith(
      expect.stringContaining('remote_post_id=$3'),
      expect.arrayContaining(['buffer-1', 'draft']),
    )
    expect(f.lock.release).toHaveBeenCalled()
  })
  it('reconciles an existing remote draft without another create', async () => {
    vi.stubEnv('BUFFER_API_KEY', 'test-secret')
    const f = fixture('uncertain')
    vi.mocked(f.client.findMatching).mockResolvedValue(remote)
    expect(await processBufferOutbox(f.req, f.client)).toMatchObject({
      processed: 1,
      state: 'draft',
    })
    expect(f.client.createDraft).not.toHaveBeenCalled()
  })
  it('blocks unknown outcomes without resending or starving the queue', async () => {
    vi.stubEnv('BUFFER_API_KEY', 'test-secret')
    const f = fixture('uncertain')
    expect(await processBufferOutbox(f.req, f.client)).toMatchObject({
      failed: 1,
      error: 'buffer_outcome_unknown_review_required',
    })
    expect(f.row.state).toBe('blocked')
    expect(f.client.createDraft).not.toHaveBeenCalled()
  })
  it('persists network ambiguity for later reconciliation', async () => {
    vi.stubEnv('BUFFER_API_KEY', 'test-secret')
    const f = fixture()
    vi.mocked(f.client.createDraft).mockRejectedValue(
      new BufferAPIError('buffer_network_error', true),
    )
    expect(await processBufferOutbox(f.req, f.client)).toMatchObject({ failed: 1 })
    expect(f.row.state).toBe('uncertain')
  })
  it('refuses social delivery for an unpublished or untranslated article', async () => {
    vi.stubEnv('BUFFER_API_KEY', 'test-secret')
    const f = fixture()
    f.find.mockResolvedValue({ docs: [] })
    expect(await processBufferOutbox(f.req, f.client)).toMatchObject({
      error: 'social_source_not_public_or_untranslated',
    })
    expect(f.client.createDraft).not.toHaveBeenCalled()
  })
  it('blocks scheduling if the Buffer text was changed outside Insight', async () => {
    vi.stubEnv('BUFFER_API_KEY', 'test-secret')
    const f = fixture('pending-schedule', 'buffer-1')
    vi.mocked(f.client.post).mockResolvedValue({ ...remote, text: 'Changed externally' })
    expect(await processBufferOutbox(f.req, f.client)).toMatchObject({
      error: 'buffer_post_changed_review_required',
    })
    expect(f.client.schedule).not.toHaveBeenCalled()
  })
  it('can cancel a schedule even after the source article is withdrawn', async () => {
    vi.stubEnv('BUFFER_API_KEY', 'test-secret')
    const f = fixture('pending-cancel', 'buffer-1')
    f.find.mockResolvedValue({ docs: [] })
    vi.mocked(f.client.post).mockResolvedValue({ ...remote, status: 'scheduled' })
    vi.mocked(f.client.cancel).mockResolvedValue(remote)
    expect(await processBufferOutbox(f.req, f.client)).toMatchObject({
      processed: 1,
      state: 'draft',
    })
    expect(f.find).not.toHaveBeenCalled()
    expect(f.client.cancel).toHaveBeenCalledWith('buffer-1')
  })
  it('rejects stale approval and releases the shared worker lock', async () => {
    const f = fixture('draft', 'buffer-1')
    await expect(
      executeBufferOperation(f.req, {
        operation: 'buffer-schedule-post',
        exportId: f.row.id,
        expectedUpdatedAt: '2025-01-01T00:00:00Z',
        publishAt: new Date(Date.now() + 600000).toISOString(),
      }),
    ).rejects.toMatchObject({ code: 'stale_social_export' })
    expect(f.lock.release).toHaveBeenCalled()
  })
  it('does not overwrite an in-flight worker with a cancellation', async () => {
    const f = fixture('scheduled', 'buffer-1')
    f.lock.query.mockResolvedValue({ rows: [{ locked: false }] })
    await expect(
      executeBufferOperation(f.req, {
        operation: 'buffer-cancel-schedule',
        exportId: f.row.id,
        expectedUpdatedAt: '2026-01-01T00:00:00Z',
      }),
    ).rejects.toMatchObject({ code: 'buffer_worker_busy_retry' })
    expect(f.query).not.toHaveBeenCalled()
  })
})
