import type { PayloadRequest } from 'payload'
import { publicationJobsWhere } from './scheduling'

// Called only after actual work or the hourly recovery check. It never changes
// an article's status and excludes terminal failures from automatic retries.
export async function nextPublicationWakeAt(req: PayloadRequest): Promise<string | null> {
  const next = await req.payload.find({
    collection: 'payload-jobs',
    where: {
      and: [
        publicationJobsWhere(),
        { hasError: { not_equals: true } },
        { processing: { equals: false } },
      ],
    },
    sort: 'waitUntil',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const times: number[] = []
  if (next.docs[0]) times.push(Date.parse(next.docs[0].waitUntil ?? new Date().toISOString()))
  if (process.env.BUFFER_API_KEY?.trim()) {
    const social = await req.payload.db.pool.query<{ wake_at: Date | string | null }>(
      `SELECT MIN(CASE WHEN state='sending' THEN updated_at + interval '2 minutes' ELSE now() END) AS wake_at
       FROM insight_social_exports
       WHERE state IN ('pending-channel-draft','pending-bootstrap','pending-preparation',
         'pending-revision','pending-draft','pending-schedule','pending-cancel','uncertain','sending')`,
    )
    if (social.rows[0]?.wake_at) times.push(new Date(social.rows[0].wake_at).getTime())
  }
  const valid = times.filter(Number.isFinite)
  return valid.length
    ? new Date(Math.max(Date.now() + 1000, Math.min(...valid))).toISOString()
    : null
}
