// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import type { BufferClient } from '@/integrations/buffer/client'
import { processBufferOutbox } from '@/integrations/buffer/service'
const text =
  'Reviewed social text\nhttps://insight.trigenys.com/fr/posts/test?utm_source=linkedin&utm_medium=social\n#TrigenysInsight'
const old = {
  id: 'old',
  name: 'Trigenys Group',
  service: 'linkedin',
  organizationId: 'org',
}
const agen = {
  id: 'agen',
  name: 'AgenStudio',
  service: 'facebook',
  organizationId: 'org',
}
function setup(channels = [old, agen]) {
  const row = {
    id: 'export',
    post_id: 21,
    state: 'pending-channel-draft',
    remote_post_id: null,
    request: {
      postId: 21,
      locale: 'fr',
      targetChannelName: 'AgenStudio',
      text,
    },
  }
  const query = vi.fn(async (sql: string) => ({
    rows: sql.includes('SELECT * FROM insight_social_exports') ? [row] : [],
  }))
  const lock = {
    query: vi.fn(async () => ({ rows: [{ locked: true }] })),
    release: vi.fn(),
  }
  const req = {
    payload: {
      db: { pool: { query, connect: vi.fn(async () => lock) } },
      find: vi.fn(async () => ({
        docs: [
          {
            id: 21,
            title: 'Public title',
            excerpt: 'Public summary',
            slug: 'test',
          },
        ],
      })),
    },
  } as unknown as PayloadRequest
  const client = {
    channels: vi.fn(async () => channels),
    findMatching: vi.fn(async () => null),
    createDraft: vi.fn(async (channelId: string, text: string) => ({
      id: 'remote',
      channelId,
      text,
      status: 'draft',
    })),
  } as unknown as BufferClient
  return { req, client, lock, query }
}
afterEach(() => vi.unstubAllEnvs())
describe('recreate drafts on the newly connected brand', () => {
  it('uses live AgenStudio, adapts the link and preserves reviewed copy without a test label', async () => {
    vi.stubEnv('BUFFER_API_KEY', 'test-only')
    const f = setup()
    expect(await processBufferOutbox(f.req, f.client)).toMatchObject({
      processed: 1,
      state: 'draft',
    })
    expect(f.client.channels).toHaveBeenCalledOnce()
    expect(f.client.createDraft).toHaveBeenCalledWith(
      'agen',
      text.replace('utm_source=linkedin', 'utm_source=facebook'),
      undefined,
    )
    expect(f.lock.release).toHaveBeenCalled()
  })
  it('does not create on Trigenys when AgenStudio is missing', async () => {
    vi.stubEnv('BUFFER_API_KEY', 'test-only')
    const f = setup([old])
    expect(await processBufferOutbox(f.req, f.client)).toMatchObject({
      failed: 1,
      error: 'buffer_named_channel_not_found_or_ambiguous',
    })
    expect(f.client.createDraft).not.toHaveBeenCalled()
  })
  it('does not create when two matching LinkedIn channels are ambiguous', async () => {
    vi.stubEnv('BUFFER_API_KEY', 'test-only')
    const f = setup([
      { ...agen, service: 'linkedin' },
      { ...agen, id: 'another', service: 'linkedin' },
    ])
    expect(await processBufferOutbox(f.req, f.client)).toMatchObject({
      failed: 1,
    })
    expect(f.client.createDraft).not.toHaveBeenCalled()
  })
})
