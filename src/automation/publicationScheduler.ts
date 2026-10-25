import { createHmac } from 'node:crypto'
import type { CollectionAfterChangeHook } from 'payload'
import type { PayloadJob } from '@/payload-types'

const schedulerURL = 'https://trigenys-insight-publisher.lawrynnjennifer.workers.dev/v1/wake'

type Logger = { error: (message: string) => void }

// A durable CMS job remains the source of truth if notification fails. The
// hourly reconciliation can recover it without polling Postgres every minute.
export async function wakePublicationScheduler(at: number, logger?: Logger): Promise<boolean> {
  const secret = process.env.PUBLICATION_SCHEDULER_SECRET
  if (!secret || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production')) return false
  const body = JSON.stringify({ at: Math.trunc(at) })
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}\nPOST\n/v1/wake\n${body}`)
    .digest('hex')
  try {
    const response = await fetch(schedulerURL, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        'X-Scheduler-Timestamp': timestamp,
        'X-Scheduler-Signature': signature,
      },
      body,
      signal: AbortSignal.timeout(5000),
    })
    await response.body?.cancel()
    if (!response.ok) throw new Error('scheduler_notification_failed')
    return true
  } catch {
    logger?.error('publication_scheduler_notification_failed; hourly recovery remains enabled')
    return false
  }
}

export const wakeQueuedPublication: CollectionAfterChangeHook<PayloadJob> = async ({
  doc,
  req,
}) => {
  const input = doc.input as { type?: string; doc?: { relationTo?: string } } | undefined
  if (
    doc.taskSlug === 'schedulePublish' &&
    input?.doc?.relationTo === 'posts' &&
    (!input.type || input.type === 'publish') &&
    !doc.processing &&
    !doc.completedAt &&
    !doc.hasError &&
    !(doc.error as { cancelled?: boolean } | null)?.cancelled
  ) {
    const at = doc.waitUntil ? Date.parse(doc.waitUntil) : Date.now()
    if (Number.isFinite(at)) await wakePublicationScheduler(at, req.payload.logger)
  }
  return doc
}
