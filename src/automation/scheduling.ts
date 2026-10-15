import {
  commitTransaction,
  initTransaction,
  killTransaction,
  type PayloadRequest,
  type Where,
} from 'payload'
import type { Post, PayloadJob } from '@/payload-types'
import type { EditorialOperation } from '../../packages/insight-automation/src/schema'
import { EditorialError } from './errors'

// Shared with the worker so an API reschedule cannot race its publication.
export async function withPublicationLock<T>(
  req: PayloadRequest,
  action: () => Promise<T>,
): Promise<T> {
  const connection = await req.payload.db.pool.connect()
  try {
    // Transaction-scoped locks also work with transaction-pooled Postgres.
    await connection.query('BEGIN')
    try {
      const result = await connection.query('SELECT pg_try_advisory_xact_lock(946321, 1) AS locked')
      if (!result.rows[0]?.locked) throw new EditorialError(409, 'publication_queue_busy_retry')
      const value = await action()
      await connection.query('COMMIT')
      return value
    } catch (error) {
      await connection.query('ROLLBACK')
      throw error
    }
  } finally {
    connection.release()
  }
}

export function publicationJobsWhere(postId?: number): Where {
  return {
    and: [
      { taskSlug: { equals: 'schedulePublish' } },
      { 'input.doc.relationTo': { equals: 'posts' } },
      // Native CMS jobs created before type was added default to publication too.
      { or: [{ 'input.type': { equals: 'publish' } }, { 'input.type': { exists: false } }] },
      { completedAt: { exists: false } },
      // PostgreSQL JSON-path comparisons do not match missing keys or a NULL
      // JSON column. Include both explicitly, otherwise fresh jobs disappear.
      {
        or: [
          { error: { exists: false } },
          { 'error.cancelled': { exists: false } },
          { 'error.cancelled': { not_equals: true } },
        ],
      },
      ...(postId
        ? [
            {
              or: [
                { 'input.doc.value': { equals: postId } },
                { 'input.doc.value': { equals: String(postId) } },
              ],
            },
          ]
        : []),
    ],
  }
}

export async function listPublicationSchedules(
  req: PayloadRequest,
  input: Extract<EditorialOperation, { operation: 'list-schedules' }>,
) {
  const result = await req.payload.find({
    collection: 'payload-jobs',
    where: publicationJobsWhere(input.postId),
    sort: 'waitUntil',
    limit: input.limit,
    page: input.page,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return {
    ok: true,
    totalDocs: result.totalDocs,
    hasNextPage: result.hasNextPage,
    docs: result.docs.map((job: PayloadJob) => {
      const input = job.input as { doc: { value: number } }
      return {
        jobId: job.id,
        postId: Number(input.doc.value),
        publishAt: job.waitUntil ?? null,
        status: job.processing ? 'PROCESSING' : job.hasError ? 'FAILED' : 'SCHEDULED',
      }
    }),
  }
}

export async function changePublicationSchedule(
  req: PayloadRequest,
  post: Post,
  input: Extract<EditorialOperation, { operation: 'schedule-post' | 'cancel-schedule' }>,
) {
  return withPublicationLock(req, async () => {
    // Refresh under the worker lock: a due job may have published since lookup.
    post = await req.payload.findByID({
      collection: 'posts',
      id: post.id,
      draft: true,
      locale: input.locale,
      fallbackLocale: false,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const where = publicationJobsWhere(post.id)
    const jobs = await req.payload.find({
      collection: 'payload-jobs',
      where,
      limit: 1000,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (jobs.docs.some((job) => job.processing))
      throw new EditorialError(409, 'publication_already_processing')
    if (input.operation === 'schedule-post') {
      if (Date.parse(input.publishAt) <= Date.now())
        throw new EditorialError(422, 'publication_date_must_be_future')
      if (post._status === 'published') throw new EditorialError(409, 'post_already_published')
      if (
        input.expectedUpdatedAt &&
        Date.parse(input.expectedUpdatedAt) !== Date.parse(post.updatedAt)
      )
        throw new EditorialError(409, 'stale_update')
      if (!post.title?.trim() || !post.content?.root?.children?.length)
        throw new EditorialError(422, 'empty_article')
      // Repeated requests with the same instant are idempotent.
      if (
        jobs.docs.length === 1 &&
        !jobs.docs[0].hasError &&
        Date.parse(jobs.docs[0].waitUntil ?? '') === Date.parse(input.publishAt)
      ) {
        return {
          ok: true,
          postId: post.id,
          jobId: jobs.docs[0].id,
          publishAt: new Date(input.publishAt).toISOString(),
          timeZone: input.timeZone,
          status: 'SCHEDULED',
        }
      }
    }
    const ownsTransaction = await initTransaction(req)
    try {
      // Delete only non-processing publication jobs. This also removes failed jobs
      // (Payload cancel deliberately skips failed jobs); never touch unpublish jobs.
      await req.payload.delete({
        collection: 'payload-jobs',
        where: { and: [where, { processing: { equals: false } }] },
        overrideAccess: true,
        req,
      })
      if (input.operation === 'cancel-schedule') {
        if (ownsTransaction) await commitTransaction(req)
        return { ok: true, postId: post.id, cancelled: jobs.totalDocs }
      }
      const job = await req.payload.jobs.queue({
        task: 'schedulePublish',
        queue: 'default',
        waitUntil: new Date(input.publishAt),
        input: {
          type: 'publish',
          doc: { relationTo: 'posts', value: post.id },
          ...(req.user ? { user: req.user.id } : {}),
        },
        req,
      })
      if (ownsTransaction) await commitTransaction(req)
      return {
        ok: true,
        postId: post.id,
        jobId: job.id,
        publishAt: new Date(input.publishAt).toISOString(),
        timeZone: input.timeZone,
        status: 'SCHEDULED',
      }
    } catch (error) {
      if (ownsTransaction) await killTransaction(req)
      throw error
    }
  })
}
