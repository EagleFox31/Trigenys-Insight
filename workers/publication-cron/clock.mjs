import { runPublicationTick } from './runner.mjs'

export class PublicationClockState {
  constructor(storage, env, run = runPublicationTick) {
    this.storage = storage
    this.env = env
    this.run = run
  }

  async wake(at) {
    if (!Number.isSafeInteger(at) || at < 0) throw new Error('Invalid publication wake time')
    const due = Math.max(Date.now() + 1000, at)
    return this.storage.transaction(async (storage) => {
      const current = await storage.getAlarm()
      const next = current === null ? due : Math.min(current, due)
      await storage.setAlarm(next)
      return { ok: true, nextWakeAt: new Date(next).toISOString() }
    })
  }

  async status() {
    const at = await this.storage.getAlarm()
    return {
      ok: true,
      nextWakeAt: at === null ? null : new Date(at).toISOString(),
      lastRun: (await this.storage.get('lastRun')) ?? null,
    }
  }

  async reconcile(reason) {
    try {
      const result = await this.run(this.env, reason)
      await this.storage.put('retryCount', 0)
      await this.storage.put('lastRun', {
        at: new Date().toISOString(),
        reason,
        ok: true,
        processed: result.processed,
        remaining: result.remaining,
        nextWakeAt: result.nextWakeAt ?? null,
      })
      // A concurrent request may already have installed an alarm: never delete
      // it while completing an outbound CMS call. Empty queues stay asleep.
      if (result.nextWakeAt) {
        const at = Date.parse(result.nextWakeAt)
        if (!Number.isFinite(at)) throw new Error('Invalid CMS wake time')
        await this.wake(at)
      }
      return result
    } catch {
      const retries = ((await this.storage.get('retryCount')) ?? 0) + 1
      await this.storage.put('retryCount', retries)
      await this.storage.put('lastRun', {
        at: new Date().toISOString(),
        reason,
        ok: false,
        retries,
      })
      const delay = Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** Math.min(retries - 1, 6))
      await this.wake(Date.now() + delay)
      console.error(JSON.stringify({ event: 'publication_retry', reason, retries, delay }))
      // Explicit persisted backoff replaces the platform's rapid retries.
      return { ok: false, retryScheduled: true }
    }
  }
}
