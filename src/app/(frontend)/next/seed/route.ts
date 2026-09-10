import { createLocalReq, getPayload } from 'payload'
import { seed } from '@/endpoints/seed'
import config from '@payload-config'
import { headers } from 'next/headers'

export const maxDuration = 60 // This function can run for a maximum of 60 seconds

export async function POST(): Promise<Response> {
  const startedAt = Date.now()
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  // Editors can seed from the admin UI. Deploy automation may use the same
  // CRON_SECRET bearer pattern as Payload jobs.
  const { user } = await payload.auth({ headers: requestHeaders })
  const cronSecret = process.env.CRON_SECRET
  const hasSystemAccess =
    Boolean(cronSecret) && requestHeaders.get('authorization') === `Bearer ${cronSecret}`

  let editor = user

  if (!editor && hasSystemAccess) {
    const users = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 2,
      overrideAccess: true,
    })

    if (users.totalDocs !== 1) {
      payload.logger.error({
        administratorsFound: users.totalDocs,
        message: 'Editorial seed requires exactly one administrator',
      })
      return new Response('Editorial seed requires exactly one administrator.', { status: 409 })
    }

    editor = users.docs[0]
  }

  if (!editor) {
    return new Response('Action forbidden.', { status: 403 })
  }

  try {
    const payloadReq = await createLocalReq({ user: editor }, payload)

    await seed({ payload, req: payloadReq })

    payload.logger.info({
      durationMs: Date.now() - startedAt,
      message: 'Editorial starter content imported',
    })

    return Response.json({ success: true })
  } catch (e) {
    payload.logger.error({ err: e, message: 'Error importing editorial starter content' })
    return new Response('Error importing editorial starter content.', { status: 500 })
  }
}
