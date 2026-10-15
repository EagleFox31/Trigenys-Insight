import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'
import { authorizedPublicationWorker } from '@/automation/workerAuth'
import { publicationJobsWhere, withPublicationLock } from '@/automation/scheduling'
import { EditorialError } from '@/automation/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const headers = { 'Cache-Control': 'no-store' }

export async function POST(request: Request) {
  if (!(await authorizedPublicationWorker(request.headers.get('authorization'))))
    return Response.json({ error: 'unauthorized' }, { status: 401, headers })
  const payload = await getPayload({ config })
  const req = await createLocalReq({}, payload)
  try {
    return await withPublicationLock(req, async () => {
      const result = await payload.jobs.run({
        allQueues: true,
        where: publicationJobsWhere(),
        limit: 10,
        req,
      })
      const statuses = Object.values(result.jobStatus ?? {})
      return Response.json(
        {
          ok: true,
          processed: statuses.length,
          failed: statuses.filter((job) => job.status !== 'success').length,
          remaining: result.remainingJobsFromQueried,
          noJobsRemaining: result.noJobsRemaining ?? false,
        },
        { headers },
      )
    })
  } catch (error) {
    if (error instanceof EditorialError)
      return Response.json({ error: error.code }, { status: error.status, headers })
    payload.logger.error({ err: error }, 'Scheduled publication worker failed')
    return Response.json({ error: 'scheduled_publication_failed' }, { status: 500, headers })
  }
}
