// @vitest-environment node
import { generateKeyPairSync, sign } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest, Where } from 'payload'
import { changePublicationSchedule, listPublicationSchedules } from '@/automation/scheduling'
import { authorizedPublicationWorker, WORKER_AUDIENCE } from '@/automation/workerAuth'
import { operationScopes } from '@/automation/oauth/core'
import { operationSchema } from '../../packages/insight-automation/src/schema'
import type { Post } from '@/payload-types'

const post = {
  id: 42,
  title: 'Un article',
  _status: 'draft',
  updatedAt: '2026-01-01T00:00:00Z',
  content: { root: { children: [{ text: 'Corps' }] } },
} as unknown as Post
const future = () => new Date(Date.now() + 86400000).toISOString()
const input = (publishAt = future()) =>
  operationSchema.parse({ operation: 'schedule-post', postId: 42, publishAt }) as Extract<
    ReturnType<typeof operationSchema.parse>,
    { operation: 'schedule-post' }
  >
function setup() {
  const jobs: Record<string, unknown>[] = []
  const matches = (job: Record<string, unknown>, where: Where): boolean =>
    Object.entries(where).every(([key, condition]) => {
      if (key === 'and' && Array.isArray(condition))
        return condition.every((value: Where) => matches(job, value))
      if (key === 'or' && Array.isArray(condition))
        return condition.some((value: Where) => matches(job, value))
      const value = key
        .split('.')
        .reduce<unknown>(
          (obj, part) =>
            obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[part] : undefined,
          job,
        )
      if (Array.isArray(condition)) return false
      if ('equals' in condition) return value === condition.equals
      if ('not_equals' in condition)
        return value !== undefined && value !== null && value !== condition.not_equals
      if ('exists' in condition) return (value !== undefined && value !== null) === condition.exists
      return false
    })
  const connection = { query: vi.fn(async () => ({ rows: [{ locked: true }] })), release: vi.fn() }
  const db = {
    pool: { connect: vi.fn(async () => connection) },
    beginTransaction: vi.fn(async () => 'tx'),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
  }
  let id = 0
  const payload = {
    db,
    findByID: vi.fn(async () => post),
    find: vi.fn(async ({ where }: { where: Where }) => {
      const docs = jobs.filter((job) => matches(job, where))
      return { docs, totalDocs: docs.length, hasNextPage: false }
    }),
    delete: vi.fn(async ({ where }: { where: Where }) => {
      const removed = jobs.filter((job) => matches(job, where))
      for (const job of removed) jobs.splice(jobs.indexOf(job), 1)
      return { docs: removed }
    }),
    jobs: {
      queue: vi.fn(async (args: { input: unknown; task: string; waitUntil: Date }) => {
        const job = {
          id: ++id,
          input: args.input,
          taskSlug: args.task,
          waitUntil: args.waitUntil.toISOString(),
          processing: false,
          hasError: false,
        }
        jobs.push(job)
        return job
      }),
    },
  }
  return { jobs, connection, payload, req: { payload } as unknown as PayloadRequest }
}

describe('publication scheduling', () => {
  it('schedules, repeats idempotently, reschedules and cancels without editing the article', async () => {
    const { req, payload, jobs } = setup()
    const firstInput = input()
    const before = structuredClone(post)
    const first = await changePublicationSchedule(req, post, firstInput)
    expect(first).toMatchObject({ status: 'SCHEDULED', timeZone: 'Africa/Douala', postId: 42 })
    expect(await changePublicationSchedule(req, post, firstInput)).toEqual(first)
    expect(jobs).toHaveLength(1)
    const second = await changePublicationSchedule(
      req,
      post,
      input(new Date(Date.now() + 172800000).toISOString()),
    )
    expect(second.jobId).not.toBe(first.jobId)
    expect(jobs).toHaveLength(1)
    expect(payload.db.commitTransaction).toHaveBeenCalledTimes(2)
    const cancelled = await changePublicationSchedule(req, post, {
      operation: 'cancel-schedule',
      postId: 42,
      locale: 'fr',
    })
    expect(cancelled).toMatchObject({ cancelled: 1 })
    expect(jobs).toHaveLength(0)
    expect(
      await changePublicationSchedule(req, post, {
        operation: 'cancel-schedule',
        postId: 42,
        locale: 'fr',
      }),
    ).toMatchObject({ cancelled: 0 })
    expect(post).toEqual(before)
  })
  it('rejects past dates, stale edits, already public articles and in-flight jobs before writing', async () => {
    const { req, payload, jobs } = setup()
    await expect(
      changePublicationSchedule(req, post, input('2020-01-01T00:00:00Z')),
    ).rejects.toMatchObject({ code: 'publication_date_must_be_future' })
    await expect(
      changePublicationSchedule(req, post, {
        ...input(),
        expectedUpdatedAt: '2020-01-01T00:00:00Z',
      }),
    ).rejects.toMatchObject({ code: 'stale_update' })
    payload.findByID.mockResolvedValueOnce({ ...post, _status: 'published' })
    await expect(changePublicationSchedule(req, post, input())).rejects.toMatchObject({
      code: 'post_already_published',
    })
    await changePublicationSchedule(req, post, input())
    jobs[0].processing = true
    await expect(
      changePublicationSchedule(req, post, {
        operation: 'cancel-schedule',
        postId: 42,
        locale: 'fr',
      }),
    ).rejects.toMatchObject({ code: 'publication_already_processing' })
    expect(payload.delete).toHaveBeenCalledTimes(1)
    expect(payload.jobs.queue).toHaveBeenCalledTimes(1)
  })
  it('keeps native CMS unpublish jobs and other collections untouched, and lists failed jobs', async () => {
    const { req, jobs } = setup()
    await changePublicationSchedule(req, post, input())
    jobs.push({
      ...jobs[0],
      id: 99,
      input: { type: 'unpublish', doc: { relationTo: 'posts', value: 42 } },
    })
    jobs.push({
      ...jobs[0],
      id: 100,
      input: { type: 'publish', doc: { relationTo: 'pages', value: 42 } },
    })
    jobs[0].hasError = true
    const listed = await listPublicationSchedules(req, {
      operation: 'list-schedules',
      limit: 50,
      page: 1,
    })
    expect(listed.docs).toHaveLength(1)
    expect(listed.docs[0].status).toBe('FAILED')
    await changePublicationSchedule(req, post, {
      operation: 'cancel-schedule',
      postId: 42,
      locale: 'fr',
    })
    expect(jobs.map((job) => job.id)).toEqual([99, 100])
  })
  it('releases the lock and rolls back when the replacement queue write fails', async () => {
    const { req, payload, connection } = setup()
    payload.jobs.queue.mockRejectedValueOnce(new Error('DB unavailable'))
    await expect(changePublicationSchedule(req, post, input())).rejects.toThrow('DB unavailable')
    expect(payload.db.rollbackTransaction).toHaveBeenCalledWith('tx')
    expect(connection.query).toHaveBeenCalledWith('ROLLBACK')
    expect(connection.release).toHaveBeenCalledOnce()
  })
  it('finds fresh jobs with NULL errors and native CMS string IDs, while excluding cancellations', async () => {
    const { req, jobs } = setup()
    await changePublicationSchedule(req, post, input())
    jobs[0].error = null
    jobs[0].input = { type: 'publish', doc: { relationTo: 'posts', value: '42' } }
    expect(
      (
        await listPublicationSchedules(req, {
          operation: 'list-schedules',
          postId: 42,
          limit: 50,
          page: 1,
        })
      ).docs,
    ).toHaveLength(1)
    jobs.push({ ...jobs[0], id: 200, error: { cancelled: true }, hasError: true })
    expect(
      (
        await listPublicationSchedules(req, {
          operation: 'list-schedules',
          postId: 42,
          limit: 50,
          page: 1,
        })
      ).docs.map((job) => job.jobId),
    ).toEqual([1])
    await changePublicationSchedule(req, post, {
      operation: 'cancel-schedule',
      postId: 42,
      locale: 'fr',
    })
    expect(jobs.map((job) => job.id)).toEqual([200])
  })
  it('requires publication scope and rejects invalid zones or date strings without offsets', () => {
    expect(operationScopes({ operation: 'schedule-post' })).toContain('editorial:publish')
    expect(operationScopes({ operation: 'cancel-schedule' })).toContain('editorial:publish')
    expect(operationScopes({ operation: 'list-schedules' })).toEqual(['editorial:read'])
    expect(() =>
      operationSchema.parse({
        operation: 'schedule-post',
        postId: 42,
        publishAt: future(),
        timeZone: 'not/a-zone',
      }),
    ).toThrow()
    expect(() => input('2027-01-01T09:00:00')).toThrow()
  })
})

describe('worker identity', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const keys = async () => [{ ...publicKey.export({ format: 'jwk' }), kid: 'test', alg: 'RS256' }]
  const claims = () => ({
    iss: 'https://token.actions.githubusercontent.com',
    aud: WORKER_AUDIENCE,
    repository: 'EagleFox31/Trigenys-Insight',
    ref: 'refs/heads/main',
    workflow_ref:
      'EagleFox31/Trigenys-Insight/.github/workflows/publish-scheduled.yml@refs/heads/main',
    event_name: 'schedule',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
  })
  function bearer(overrides = {}, header = {}) {
    const prefix = [
      { alg: 'RS256', kid: 'test', ...header },
      { ...claims(), ...overrides },
    ]
      .map((value) => Buffer.from(JSON.stringify(value)).toString('base64url'))
      .join('.')
    return `Bearer ${prefix}.${sign('RSA-SHA256', Buffer.from(prefix), privateKey).toString('base64url')}`
  }
  it('accepts only a signed short-lived identity for the exact production workflow', async () => {
    expect(await authorizedPublicationWorker(bearer(), keys)).toBe(true)
    for (const override of [
      { repository: 'attacker/repo' },
      { ref: 'refs/pull/1/merge' },
      { aud: 'other' },
      { workflow_ref: 'EagleFox31/Trigenys-Insight/.github/workflows/other.yml@refs/heads/main' },
      { event_name: 'pull_request' },
      { exp: 0 },
      { iat: 0 },
      { iss: 'other' },
    ])
      expect(await authorizedPublicationWorker(bearer(override), keys)).toBe(false)
    expect(await authorizedPublicationWorker(bearer({}, { alg: 'none' }), keys)).toBe(false)
    expect(await authorizedPublicationWorker(bearer().slice(0, -8) + 'bad', keys)).toBe(false)
    expect(await authorizedPublicationWorker(null, keys)).toBe(false)
  })
})
