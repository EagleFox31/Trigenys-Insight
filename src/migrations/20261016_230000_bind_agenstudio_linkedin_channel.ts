import { createHash } from 'node:crypto'
import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

// Bind the twelve rejected requests to the actual connected LinkedIn channel.
// The owner's brand name is AgenStudio; Buffer reports its handle as agensstudio.
// Only known pre-creation failures are retried, using the same request IDs/keys.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  const cached = await db.execute(sql`SELECT channels FROM insight_buffer_connection WHERE id=true`)
  const channels = cached.rows[0]?.channels as
    { id: string; name: string; service: string; organizationId: string }[] | undefined
  const channel = channels?.find(
    (item) =>
      item.id === '6ad26527778b240e2f2c8743' &&
      item.name === 'agensstudio' &&
      item.service === 'linkedin',
  )
  if (!channel)
    throw new Error('The verified AgenStudio LinkedIn channel changed; review before retrying')
  const revisions: { id: string; request: Record<string, unknown> }[] = []
  for (const postId of [5, 21, 22, 25, 26, 27, 28, 29, 30, 31, 32, 33]) {
    const key = `agenstudio-recreate-20261016-fr-${postId}-v1`
    const result =
      await db.execute(sql`SELECT id,state,request,remote_post_id,last_error FROM insight_social_exports
      WHERE idempotency_key=${key} AND post_id=${postId} FOR UPDATE`)
    const row = result.rows[0]
    if (
      !row ||
      row.state !== 'failed' ||
      row.remote_post_id ||
      row.last_error !== 'buffer_named_channel_not_found_or_ambiguous'
    )
      throw new Error(
        'A selected request changed; only confirmed pre-creation failures may be retried',
      )
    const previous = row.request as Record<string, unknown>
    if (typeof previous.text !== 'string' || previous.text.length > 3000)
      throw new Error('The reviewed social text is missing or too long')
    revisions.push({
      id: String(row.id),
      request: { ...previous, targetChannelName: channel.name, channelId: channel.id, channel },
    })
  }
  for (const item of revisions) {
    const body = JSON.stringify(item.request)
    const fingerprint = createHash('sha256').update(body).digest('hex')
    await db.execute(sql`UPDATE insight_social_exports SET state='pending-preparation',request=${body}::jsonb,
      body_hash=${fingerprint},last_error=NULL,
      updated_at=GREATEST(date_trunc('milliseconds',now()),updated_at + interval '1 millisecond')
      WHERE id=${item.id}::uuid AND state='failed' AND remote_post_id IS NULL`)
  }
}
export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Retain Buffer draft receipts and idempotency keys')
}
