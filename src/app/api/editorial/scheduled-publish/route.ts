import { processBufferOutbox } from '@/integrations/buffer/service'
import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'
import { authorizedPublicationWorker } from '@/automation/workerAuth'
import { authorizedPublicationCron } from '@/automation/publicationCronAuth'
import { publicationJobsWhere, withPublicationLock } from '@/automation/scheduling'
import { EditorialError } from '@/automation/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const headers = { 'Cache-Control': 'no-store' }

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization')
  if (
    !authorizedPublicationCron(authorization) &&
    !(await authorizedPublicationWorker(authorization))
  )
    return Response.json({ error: 'unauthorized' }, { status: 401, headers })
  const payload = await getPayload({ config })
  const req = await createLocalReq({}, payload)
  try {
    const publication = await withPublicationLock(req, async () => {
      const result = await payload.jobs.run({
        allQueues: true,
        where: publicationJobsWhere(),
        limit: 10,
        req,
      })
      const statuses = Object.values(result.jobStatus ?? {})
      return {
        ok: true,
        processed: statuses.length,
        failed: statuses.filter((job) => job.status !== 'success').length,
        remaining: result.remainingJobsFromQueried,
        noJobsRemaining: result.noJobsRemaining ?? false,
      }
    })
    // Buffer failures never prevent article publication. This queue can only
    // deliver explicit social requests; creating a draft never schedules it.
    let buffer
    try {
      buffer = await processBufferOutbox(req)
    } catch {
      buffer = { processed: 0, failed: 1, error: 'buffer_worker_unavailable' }
    }
    return Response.json({ ...publication, buffer }, { headers })
  } catch (error) {
    if (error instanceof EditorialError)
      return Response.json({ error: error.code }, { status: error.status, headers })
    payload.logger.error({ err: error }, 'Scheduled publication worker failed')
    return Response.json({ error: 'scheduled_publication_failed' }, { status: 500, headers })
  }
}
