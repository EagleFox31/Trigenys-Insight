import { selectNamedSocialChannel, adaptTrackedSource } from './channelSelection'
import { createHash, randomUUID } from 'node:crypto'
import type { PayloadRequest } from 'payload'
import type { Post } from '@/payload-types'
import { EditorialError } from '@/automation/errors'
import { relationId } from '@/automation/contentInspection'
import { BufferClient, BufferAPIError, type BufferChannel } from './client'
import { socialQuery, summarizeExport, type SocialExport, type SocialRequest } from './store'
import type { EditorialOperation } from '../../../packages/insight-automation/src/schema'

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export async function syncBufferConnection(req: PayloadRequest, client = new BufferClient()) {
  try {
    const channels = await client.channels()
    await socialQuery(
      req,
      `INSERT INTO insight_buffer_connection (id, channels, checked_at, last_error) VALUES (true,$1::jsonb,now(),NULL)
      ON CONFLICT (id) DO UPDATE SET channels=EXCLUDED.channels,checked_at=now(),last_error=NULL`,
      [JSON.stringify(channels)],
    )
    return { ok: true, configured: true, channels }
  } catch (error) {
    const code = error instanceof BufferAPIError ? error.code : 'buffer_connection_failed'
    await socialQuery(
      req,
      `INSERT INTO insight_buffer_connection (id,last_error) VALUES (true,$1)
      ON CONFLICT (id) DO UPDATE SET checked_at=now(),last_error=EXCLUDED.last_error`,
      [code],
    )
    throw new EditorialError(502, code)
  }
}
async function publicPost(req: PayloadRequest, postId: number, locale: 'fr' | 'en'): Promise<Post> {
  const result = await req.payload.find({
    collection: 'posts',
    where: {
      and: [{ id: { equals: postId } }, { _status: { equals: 'published' } }],
    },
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  const post = result.docs[0]
  if (!post?.title?.trim() || !post.excerpt?.trim())
    throw new EditorialError(422, 'social_source_not_public_or_untranslated')
  return post
}
export async function socialRequest(
  req: PayloadRequest,
  post: Post,
  locale: 'fr' | 'en',
  channel: BufferChannel,
  suppliedText?: string,
  bootstrap = false,
): Promise<SocialRequest> {
  if (!['linkedin', 'facebook'].includes(channel.service.toLowerCase()))
    throw new EditorialError(422, 'social_channel_not_supported_yet')
  const sourceURL = new URL(`/${locale}/posts/${post.slug}`, 'https://insight.trigenys.com')
  sourceURL.searchParams.set('utm_source', channel.service.toLowerCase())
  sourceURL.searchParams.set('utm_medium', 'social')
  sourceURL.searchParams.set('utm_campaign', `insight-post-${post.id}`)
  const defaultText =
    channel.service.toLowerCase() === 'linkedin'
      ? `${post.title}\n\n${post.excerpt}\n\n${locale === 'fr' ? 'Notre retour d’expérience et les points à retenir :' : 'Our findings and lessons learned:'}\n${sourceURL}`
      : `${post.title}\n\n${post.excerpt}\n\n${locale === 'fr' ? 'À lire sur Trigenys Insight 👇' : 'Read it on Trigenys Insight 👇'}\n${sourceURL}`
  const text =
    suppliedText ??
    `${bootstrap ? '[Test d’intégration — brouillon à relire]\n\n' : ''}${defaultText}`
  if (text.length > 3000) throw new EditorialError(422, 'social_text_too_long')
  let imageURL: string | undefined
  const mediaId = relationId(post.heroImage)
  if (mediaId) {
    const media = await req.payload.findByID({
      collection: 'media',
      id: mediaId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (media.url) {
      const url = new URL(media.url, 'https://insight.trigenys.com')
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        !(
          url.hostname === 'insight.trigenys.com' ||
          url.hostname.endsWith('.public.blob.vercel-storage.com')
        )
      )
        throw new EditorialError(422, 'social_image_url_not_supported')
      imageURL = url.toString()
    }
  }
  return {
    postId: post.id,
    locale,
    channelId: channel.id,
    channel,
    text,
    sourceURL: sourceURL.toString(),
    ...(imageURL ? { imageURL } : {}),
    ...(bootstrap ? { bootstrap: true } : {}),
  }
}
async function executeBufferOperationUnlocked(
  req: PayloadRequest,
  input: Extract<
    EditorialOperation,
    {
      operation:
        | 'buffer-update-draft'
        | 'buffer-status'
        | 'buffer-create-draft'
        | 'buffer-list-posts'
        | 'buffer-schedule-post'
        | 'buffer-cancel-schedule'
    }
  >,
) {
  if (input.operation === 'buffer-status') return syncBufferConnection(req)
  if (input.operation === 'buffer-list-posts') {
    const where = input.postId ? 'WHERE post_id=$1' : ''
    const values = input.postId ? [input.postId] : []
    const [docs, count] = await Promise.all([
      socialQuery<SocialExport>(
        req,
        `SELECT * FROM insight_social_exports ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, input.limit, (input.page - 1) * input.limit],
      ),
      socialQuery<{ count: string }>(
        req,
        `SELECT COUNT(*) FROM insight_social_exports ${where}`,
        values,
      ),
    ])
    const totalDocs = Number(count[0].count)
    return {
      ok: true,
      docs: docs.map(summarizeExport),
      totalDocs,
      page: input.page,
      limit: input.limit,
      hasNextPage: input.page * input.limit < totalDocs,
    }
  }
  if (input.operation === 'buffer-create-draft') {
    const post = await publicPost(req, input.postId, input.locale)
    const connection = await syncBufferConnection(req)
    const channel = connection.channels.find((item) => item.id === input.channelId)
    if (!channel) throw new EditorialError(422, 'buffer_channel_not_found')
    const request = await socialRequest(req, post, input.locale, channel, input.text)
    const fingerprint = hash(request)
    const rows = await socialQuery<SocialExport>(
      req,
      `INSERT INTO insight_social_exports (id,post_id,idempotency_key,body_hash,state,request)
      VALUES ($1,$2,$3,$4,'pending-draft',$5::jsonb) ON CONFLICT (idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *`,
      [randomUUID(), post.id, input.idempotencyKey, fingerprint, JSON.stringify(request)],
    )
    if (rows[0].body_hash !== fingerprint)
      throw new EditorialError(409, 'social_idempotency_conflict')
    // Delivery happens on the next scheduled worker tick. No publication here.
    return { ok: true, export: summarizeExport(rows[0]) }
  }
  if (input.operation === 'buffer-update-draft') {
    const rows = await socialQuery<SocialExport>(
      req,
      'SELECT * FROM insight_social_exports WHERE id=$1',
      [input.exportId],
    )
    const row = rows[0]
    if (!row) throw new EditorialError(404, 'social_export_not_found')
    if (new Date(row.updated_at).getTime() !== Date.parse(input.expectedUpdatedAt))
      throw new EditorialError(409, 'stale_social_export')
    if (row.state !== 'draft' || !row.remote_post_id || !row.request.channel || !row.request.text)
      throw new EditorialError(409, 'social_export_not_a_draft')
    const post = await publicPost(req, input.postId, input.locale)
    const request = {
      ...(await socialRequest(req, post, input.locale, row.request.channel, input.text)),
      previousText: row.request.text,
    }
    const updated = await socialQuery<SocialExport>(
      req,
      `UPDATE insight_social_exports SET post_id=$2,state='pending-revision',request=$3::jsonb,body_hash=$4,last_error=NULL,updated_at=GREATEST(date_trunc('milliseconds', now()), updated_at + interval '1 millisecond') WHERE id=$1 AND updated_at=$5::timestamptz AND state='draft' RETURNING *`,
      [row.id, post.id, JSON.stringify(request), hash(request), row.updated_at],
    )
    if (!updated.length) throw new EditorialError(409, 'stale_social_export')
    return { ok: true, export: summarizeExport(updated[0]) }
  }
  const cancellation = input.operation === 'buffer-cancel-schedule'
  if (!cancellation && Date.parse(input.publishAt) < Date.now() + 120000)
    throw new EditorialError(422, 'social_schedule_requires_two_minutes_notice')
  const rows = await socialQuery<SocialExport>(
    req,
    'SELECT * FROM insight_social_exports WHERE id=$1',
    [input.exportId],
  )
  const row = rows[0]
  if (!row) throw new EditorialError(404, 'social_export_not_found')
  if (new Date(row.updated_at).getTime() !== Date.parse(input.expectedUpdatedAt))
    throw new EditorialError(409, 'stale_social_export')
  const target = cancellation ? 'pending-cancel' : 'pending-schedule'
  if (
    !(cancellation
      ? ['scheduled', 'pending-schedule'].includes(row.state)
      : row.state === 'draft') ||
    !row.remote_post_id
  )
    throw new EditorialError(409, 'social_export_not_ready')
  const request = {
    ...row.request,
    ...(cancellation ? {} : { publishAt: input.publishAt }),
  }
  const updated = await socialQuery<SocialExport>(
    req,
    `UPDATE insight_social_exports SET state=$2,request=$3::jsonb,last_error=NULL,updated_at=GREATEST(date_trunc('milliseconds', now()), updated_at + interval '1 millisecond')
    WHERE id=$1 AND updated_at=$4::timestamptz AND state=$5 RETURNING *`,
    [row.id, target, JSON.stringify(request), row.updated_at, row.state],
  )
  if (!updated.length) throw new EditorialError(409, 'stale_social_export')
  return { ok: true, export: summarizeExport(updated[0]) }
}

// Use the delivery lock for approval/cancellation too: a worker cannot overwrite
// a newer cancellation while it is waiting for the provider response.
export async function executeBufferOperation(
  req: PayloadRequest,
  input: Parameters<typeof executeBufferOperationUnlocked>[1],
) {
  if (
    !['buffer-schedule-post', 'buffer-cancel-schedule', 'buffer-update-draft'].includes(
      input.operation,
    )
  )
    return executeBufferOperationUnlocked(req, input)
  const lock = await req.payload.db.pool.connect()
  try {
    await lock.query('BEGIN')
    const result = await lock.query('SELECT pg_try_advisory_xact_lock(946321, 2) AS locked')
    if (!result.rows[0]?.locked) throw new EditorialError(409, 'buffer_worker_busy_retry')
    return await executeBufferOperationUnlocked(req, input)
  } finally {
    try {
      await lock.query('ROLLBACK')
    } finally {
      lock.release()
    }
  }
}

export function bootstrapChannel(channels: BufferChannel[]): BufferChannel | null {
  const candidates = channels.filter(
    (c) => /trigenys/i.test(c.name) && ['linkedin', 'facebook'].includes(c.service.toLowerCase()),
  )
  for (const service of ['linkedin', 'facebook']) {
    const exact = candidates.filter(
      (c) => c.service.toLowerCase() === service && /^trigenys insight$/i.test(c.name.trim()),
    )
    if (exact.length === 1) return exact[0]
    const matches = candidates.filter((c) => c.service.toLowerCase() === service)
    if (matches.length === 1) return matches[0]
    if (matches.length > 1) return null
  }
  return null
}
export async function processBufferOutbox(req: PayloadRequest, client = new BufferClient()) {
  if (!process.env.BUFFER_API_KEY?.trim()) return { processed: 0, failed: 0, configured: false }
  const lock = await req.payload.db.pool.connect()
  try {
    await lock.query('BEGIN')
    const acquired = await lock.query('SELECT pg_try_advisory_xact_lock(946321, 2) AS locked')
    if (!acquired.rows[0]?.locked) return { processed: 0, failed: 0, busy: true }
    // A crashed mutation has an unknown outcome. It is never blindly sent again.
    await socialQuery(
      req,
      `UPDATE insight_social_exports SET state='uncertain',last_error='buffer_delivery_interrupted',updated_at=GREATEST(date_trunc('milliseconds', now()), updated_at + interval '1 millisecond')
      WHERE state='sending' AND updated_at < now() - interval '2 minutes'`,
    )
    const pending = await socialQuery<SocialExport>(
      req,
      `SELECT * FROM insight_social_exports
      WHERE state IN ('pending-channel-draft','pending-bootstrap','pending-preparation','pending-revision','pending-draft','pending-schedule','pending-cancel','uncertain')
      ORDER BY CASE WHEN state='uncertain' THEN 1 ELSE 0 END, created_at ASC LIMIT 1`,
    )
    if (!pending.length) return { processed: 0, failed: 0 }
    const row = pending[0]
    let mutationAttempted = false
    let receiptPending = false
    try {
      // Withdrawal of the article must never prevent cancelling its social schedule.
      if (row.state !== 'pending-cancel') await publicPost(req, row.post_id, row.request.locale)
      let request = row.request
      if (['pending-bootstrap', 'pending-channel-draft'].includes(row.state)) {
        const named = row.state === 'pending-channel-draft'
        if (named && (!request.targetChannelName || !request.text))
          throw new EditorialError(422, 'buffer_named_draft_incomplete')
        const connection = await syncBufferConnection(req, client)
        const channel = named
          ? selectNamedSocialChannel(connection.channels, request.targetChannelName!)
          : bootstrapChannel(connection.channels)
        if (!channel)
          throw new EditorialError(
            409,
            named
              ? 'buffer_named_channel_not_found_or_ambiguous'
              : 'buffer_test_needs_channel_selection',
          )
        request = await socialRequest(
          req,
          await publicPost(req, row.post_id, request.locale),
          request.locale,
          channel,
          named ? adaptTrackedSource(request.text!, channel.service) : undefined,
          !named,
        )
        await socialQuery(
          req,
          "UPDATE insight_social_exports SET request=$2::jsonb,body_hash=$3,updated_at=GREATEST(date_trunc('milliseconds', now()), updated_at + interval '1 millisecond') WHERE id=$1",
          [row.id, JSON.stringify(request), hash(request)],
        )
      }
      if (['pending-preparation', 'pending-revision'].includes(row.state)) {
        if (!request.channel || !request.text)
          throw new EditorialError(422, 'buffer_export_incomplete')
        request = {
          ...(await socialRequest(
            req,
            await publicPost(req, row.post_id, request.locale),
            request.locale,
            request.channel,
            request.text,
          )),
          ...(request.previousText ? { previousText: request.previousText } : {}),
        }
        await socialQuery(
          req,
          'UPDATE insight_social_exports SET request=$2::jsonb,body_hash=$3 WHERE id=$1',
          [row.id, JSON.stringify(request), hash(request)],
        )
      }
      if (!request.channel || !request.text)
        throw new EditorialError(422, 'buffer_export_incomplete')
      let remote
      if (
        [
          'pending-draft',
          'pending-bootstrap',
          'pending-channel-draft',
          'pending-preparation',
          'uncertain',
        ].includes(row.state) &&
        !row.remote_post_id
      ) {
        remote = await client.findMatching(request.channel, request.text)
        if (!remote && row.state === 'uncertain')
          throw new EditorialError(409, 'buffer_outcome_unknown_review_required')
        if (!remote) {
          await socialQuery(
            req,
            "UPDATE insight_social_exports SET state='sending',attempts=attempts+1,updated_at=GREATEST(date_trunc('milliseconds', now()), updated_at + interval '1 millisecond') WHERE id=$1",
            [row.id],
          )
          mutationAttempted = true
          remote = await client.createDraft(request.channel.id, request.text, request.imageURL)
        }
        if (
          remote.status !== 'draft' ||
          remote.channelId !== request.channel.id ||
          remote.text !== request.text
        )
          throw new BufferAPIError('buffer_draft_state_unexpected', true)
      } else {
        if (!row.remote_post_id) throw new EditorialError(422, 'buffer_post_id_missing')
        remote = await client.post(row.remote_post_id)
        if (
          remote.channelId !== request.channel.id ||
          (remote.text !== request.text &&
            !(row.state === 'pending-revision' && remote.text === request.previousText))
        )
          throw new EditorialError(409, 'buffer_post_changed_review_required')
        if (row.state === 'pending-revision') {
          if (remote.status !== 'draft') throw new EditorialError(409, 'buffer_post_not_a_draft')
          if (remote.text !== request.text) {
            mutationAttempted = true
            remote = await client.editDraft(remote.id, request.text, request.imageURL)
          }
          if (
            remote.id !== row.remote_post_id ||
            remote.status !== 'draft' ||
            remote.channelId !== request.channel.id ||
            remote.text !== request.text
          )
            throw new BufferAPIError('buffer_revision_state_unexpected', true)
        } else if (row.state === 'pending-schedule') {
          if (Date.parse(request.publishAt ?? '') <= Date.now() + 15000)
            throw new EditorialError(422, 'social_schedule_is_no_longer_future')
          if (
            remote.status === 'scheduled' &&
            remote.dueAt &&
            Date.parse(remote.dueAt) === Date.parse(request.publishAt!)
          ) {
            /* prior scheduling request succeeded */
          } else {
            if (remote.status !== 'draft') throw new EditorialError(409, 'buffer_post_not_a_draft')
            mutationAttempted = true
            remote = await client.schedule(remote.id, request.publishAt!)
          }
          if (
            remote.status !== 'scheduled' ||
            Date.parse(remote.dueAt ?? '') !== Date.parse(request.publishAt!)
          )
            throw new BufferAPIError('buffer_schedule_state_unexpected', true)
        } else if (row.state === 'pending-cancel') {
          if (!['draft', 'scheduled'].includes(remote.status))
            throw new EditorialError(409, 'buffer_post_already_processed')
          if (remote.status !== 'draft') {
            mutationAttempted = true
            remote = await client.cancel(remote.id)
          }
          if (remote.status !== 'draft')
            throw new BufferAPIError('buffer_cancel_state_unexpected', true)
        } else if (
          row.state === 'uncertain' &&
          !(request.previousText && remote.status === 'draft' && remote.text === request.text)
        )
          throw new EditorialError(409, 'buffer_outcome_unknown_review_required')
      }
      receiptPending = true
      const state =
        remote.status === 'draft' ? 'draft' : remote.status === 'sent' ? 'sent' : 'scheduled'
      await socialQuery(
        req,
        `UPDATE insight_social_exports SET state=$2,remote_post_id=$3,remote_status=$4,request=$5::jsonb,last_error=NULL,updated_at=GREATEST(date_trunc('milliseconds', now()), updated_at + interval '1 millisecond') WHERE id=$1`,
        [
          row.id,
          state,
          remote.id,
          remote.status,
          JSON.stringify({
            ...request,
            previousText: undefined,
            ...(row.state === 'pending-cancel' ? { publishAt: undefined } : {}),
          }),
        ],
      )
      return { processed: 1, failed: 0, exportId: row.id, state }
    } catch (error) {
      const ambiguous =
        (error instanceof BufferAPIError && error.ambiguous) ||
        (mutationAttempted && receiptPending)
      const code =
        error instanceof EditorialError || error instanceof BufferAPIError
          ? error.code
          : 'buffer_delivery_failed'
      await socialQuery(
        req,
        "UPDATE insight_social_exports SET state=$2,last_error=$3,updated_at=GREATEST(date_trunc('milliseconds', now()), updated_at + interval '1 millisecond') WHERE id=$1",
        [
          row.id,
          ambiguous
            ? 'uncertain'
            : code === 'buffer_outcome_unknown_review_required'
              ? 'blocked'
              : 'failed',
          code,
        ],
      )
      return { processed: 0, failed: 1, error: code }
    }
  } finally {
    try {
      await lock.query('ROLLBACK')
    } finally {
      lock.release()
    }
  }
}
