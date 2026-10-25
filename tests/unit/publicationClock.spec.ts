// @vitest-environment node
import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PayloadJob } from '@/payload-types'
import type { PayloadRequest } from 'payload'
import { wakePublicationScheduler, wakeQueuedPublication } from '@/automation/publicationScheduler'
import { nextPublicationWakeAt } from '@/automation/publicationQueueState'
import { PublicationClockState } from '../../workers/publication-cron/clock.mjs'
import worker from '../../workers/publication-cron/handlers.mjs'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

type TickResult = { ok: boolean; processed: number; nextWakeAt: string | null }
function clockFixture(
  run = vi.fn(async (): Promise<TickResult> => ({ ok: true, processed: 0, nextWakeAt: null })),
) {
  const values = new Map()
  let alarm: number | null = null
  const storage = {
    getAlarm: vi.fn(async () => alarm),
    setAlarm: vi.fn(async (at: number) => {
      alarm = at
    }),
    get: vi.fn(async (key: string) => values.get(key)),
    put: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value)
    }),
    transaction: async (action: (tx: unknown) => unknown): Promise<unknown> => action(storage),
  }
  const clock = new PublicationClockState(storage, {}, run)
  return {
    clock,
    run,
    storage,
    fire: async () => {
      alarm = null
      return clock.reconcile('alarm')
    },
  }
}

describe('publication clock without idle database polling', () => {
  it('does not call the CMS when registering work, preserves the earliest deadline, and sleeps after draining', async () => {
    const { clock, run, storage, fire } = clockFixture()
    const first = Date.now() + 60000
    await clock.wake(first)
    await clock.wake(first + 60000)
    expect(await storage.getAlarm()).toBe(first)
    await clock.wake(first - 10000)
    expect(await storage.getAlarm()).toBe(first - 10000)
    expect(run).not.toHaveBeenCalled()
    await fire()
    expect(run).toHaveBeenCalledTimes(1)
    expect((await clock.status()).nextWakeAt).toBeNull()
  })

  it('chains the next CMS deadline and preserves new work arriving during a CMS call', async () => {
    const { clock, storage, run, fire } = clockFixture()
    const next = Date.now() + 90000
    run.mockImplementationOnce(async () => {
      await clock.wake(next - 30000)
      return { ok: true, processed: 1, nextWakeAt: new Date(next).toISOString() }
    })
    await fire()
    expect(await storage.getAlarm()).toBe(next - 30000)
    expect((await clock.status()).lastRun.processed).toBe(1)
  })

  it('persists exponential retries instead of a permanent minute loop', async () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-10-25T12:00:00Z')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { clock, run, storage, fire } = clockFixture()
    run.mockRejectedValue(new Error('HTTP 503'))
    await fire()
    expect(await storage.getAlarm()).toBe(Date.now() + 60000)
    await fire()
    expect(await storage.getAlarm()).toBe(Date.now() + 120000)
    expect((await clock.status()).lastRun).toMatchObject({ ok: false, retries: 2 })
  })

  it('runs only one reconciliation for the hourly safety trigger', async () => {
    const reconcile = vi.fn()
    await worker.scheduled({}, { PUBLICATION_CLOCK: { getByName: () => ({ reconcile }) } })
    expect(reconcile).toHaveBeenCalledExactlyOnceWith('hourly-recovery')
  })
})

describe('authenticated CMS wakeups', () => {
  const secret = 'a-test-secret-that-is-never-used-in-production'
  function request(body = JSON.stringify({ at: Date.now() + 60000 }), age = 0) {
    const timestamp = String(Math.floor(Date.now() / 1000) - age)
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}\nPOST\n/v1/wake\n${body}`)
      .digest('hex')
    return new Request('https://clock.example/v1/wake', {
      method: 'POST',
      body,
      headers: { 'X-Scheduler-Timestamp': timestamp, 'X-Scheduler-Signature': signature },
    })
  }
  it('accepts the actual CMS notification format and never publishes on registration', async () => {
    vi.stubEnv('PUBLICATION_SCHEDULER_SECRET', secret)
    vi.stubEnv('VERCEL_ENV', 'production')
    const wake = vi.fn(async () => ({ ok: true }))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) =>
        worker.fetch(new Request(url, init), {
          PUBLICATION_SCHEDULER_SECRET: secret,
          PUBLICATION_CLOCK: { getByName: () => ({ wake }) },
        }),
      ),
    )
    const at = Date.now() + 120000
    expect(await wakePublicationScheduler(at)).toBe(true)
    expect(wake).toHaveBeenCalledExactlyOnceWith(at)
  })

  it('rejects unsigned, stale, altered and oversized requests before accessing the clock', async () => {
    const getByName = vi.fn()
    const env = { PUBLICATION_SCHEDULER_SECRET: secret, PUBLICATION_CLOCK: { getByName } }
    expect(
      (await worker.fetch(new Request('https://clock.example/v1/wake', { method: 'POST' }), env))
        .status,
    ).toBe(401)
    expect((await worker.fetch(request(undefined, 61), env)).status).toBe(401)
    const signed = request()
    const altered = new Request(signed.url, {
      method: 'POST',
      headers: signed.headers,
      body: '{"at":1}',
    })
    expect((await worker.fetch(altered, env)).status).toBe(401)
    expect((await worker.fetch(request('x'.repeat(257)), env)).status).toBe(413)
    expect(getByName).not.toHaveBeenCalled()
  })

  it('leaves durable jobs recoverable when notification fails and keeps previews isolated', async () => {
    vi.stubEnv('PUBLICATION_SCHEDULER_SECRET', secret)
    vi.stubEnv('VERCEL_ENV', 'preview')
    const fetch = vi.fn(async () => new Response(null, { status: 503 }))
    vi.stubGlobal('fetch', fetch)
    expect(await wakePublicationScheduler(Date.now())).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
    vi.stubEnv('VERCEL_ENV', 'production')
    const logger = { error: vi.fn() }
    expect(await wakePublicationScheduler(Date.now(), logger)).toBe(false)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it('notifies for queued article publications while ignoring unrelated, finished or failed jobs', async () => {
    vi.stubEnv('PUBLICATION_SCHEDULER_SECRET', secret)
    vi.stubEnv('VERCEL_ENV', 'production')
    const fetch = vi.fn(async () => Response.json({ ok: true }, { status: 202 }))
    vi.stubGlobal('fetch', fetch)
    const doc = {
      id: 1,
      taskSlug: 'schedulePublish',
      input: { doc: { relationTo: 'posts', value: 42 } },
      waitUntil: new Date(Date.now() + 60000).toISOString(),
      hasError: false,
      processing: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as PayloadJob
    const hook = async (job: PayloadJob) =>
      wakeQueuedPublication({
        doc: job,
        req: { payload: { logger: { error: vi.fn() } } } as unknown as PayloadRequest,
      } as Parameters<typeof wakeQueuedPublication>[0])
    await hook(doc)
    for (const job of [
      { ...doc, input: { type: 'unpublish', doc: { relationTo: 'posts' } } },
      { ...doc, input: { doc: { relationTo: 'pages' } } },
      { ...doc, completedAt: new Date().toISOString() },
      { ...doc, processing: true },
      { ...doc, hasError: true },
      { ...doc, error: { cancelled: true } },
    ])
      await hook(job as PayloadJob)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('next useful deadline', () => {
  it('returns no wakeup for empty queues and selects Buffer work before a distant article', async () => {
    vi.stubEnv('BUFFER_API_KEY', 'test')
    const find = vi.fn(async () => ({ docs: [] as { waitUntil: string }[] }))
    const query = vi.fn(async () => ({ rows: [{ wake_at: null as Date | null }] }))
    const req = { payload: { find, db: { pool: { query } } } } as unknown as PayloadRequest
    expect(await nextPublicationWakeAt(req)).toBeNull()
    const article = new Date(Date.now() + 90000)
    const social = new Date(Date.now() + 30000)
    find.mockResolvedValue({ docs: [{ waitUntil: article.toISOString() }] })
    query.mockResolvedValue({ rows: [{ wake_at: social }] })
    expect(await nextPublicationWakeAt(req)).toBe(social.toISOString())
  })
})
