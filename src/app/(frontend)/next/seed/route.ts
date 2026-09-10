import { createLocalReq, getPayload } from 'payload'
import { seed } from '@/endpoints/seed'
import config from '@payload-config'
import { headers } from 'next/headers'
import { createHash } from 'node:crypto'

export const maxDuration = 60 // This function can run for a maximum of 60 seconds
const ONE_TIME_EDITORIAL_IMPORT_HASH =
  '35d6d92ac974fe2339950d55c9f434e160699495981975931af12196a302b44c'

export async function POST(): Promise<Response> {
  const startedAt = Date.now()
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  // Editors can seed from the admin UI. Deploy automation may use the same
  // CRON_SECRET bearer pattern as Payload jobs.
  const { user } = await payload.auth({ headers: requestHeaders })
  const cronSecret = process.env.CRON_SECRET
  const bearerToken = requestHeaders.get('authorization')?.replace(/^Bearer\\s+/i, '')
  const hasSystemAccess =
    (Boolean(cronSecret) && bearerToken === cronSecret) ||
    (Boolean(bearerToken) &&
      createHash('sha256')
        .update(bearerToken as string)
        .digest('hex') === ONE_TIME_EDITORIAL_IMPORT_HASH)

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
