import { createHash, randomUUID } from 'node:crypto'
import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import drafts from '../editorial/social/20261016-linkedin.json'

// Owner requested longer, curiosity-led drafts for the October 15 publications.
// Retarget the existing test draft rather than deleting it or creating a duplicate.
// Queue only drafts: no publication date, queue slot or publish action is requested.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  const current = await db.execute(sql`SELECT * FROM insight_social_exports
    WHERE id = 'b4f49e8e-7c40-4c27-9f7d-74cff104c502' FOR UPDATE`)
  const previous = current.rows[0]
  if (
    !previous ||
    previous.state !== 'draft' ||
    previous.post_id !== 1 ||
    previous.remote_post_id !== '6ad1583ce991a49db3b8b4fc'
  )
    throw new Error('The integration test draft changed; review it before replacing it')
  const original = previous.request as {
    text: string
    channel: { id: string; name: string; service: string; organizationId: string }
  }
  if (
    !original.text ||
    original.channel?.id !== '6ab2c159ea19ca0bdeb86ba3' ||
    original.channel.service !== 'linkedin'
  )
    throw new Error('The verified LinkedIn channel changed; no social drafts queued')
  for (const item of drafts) {
    if (item.text.length > 3000) throw new Error('Social draft exceeds LinkedIn text limit')
    const source = await db.execute(sql`SELECT id FROM posts WHERE id=${item.postId}
      AND _status='published' AND (published_at AT TIME ZONE 'Africa/Lagos')::date = DATE '2026-10-15'`)
    if (!source.rows.length) throw new Error('A selected October 15 article is no longer public')
  }
  for (const item of drafts) {
    const revision = item.postId === 21
    const request = {
      postId: item.postId,
      locale: 'fr',
      channelId: original.channel.id,
      channel: original.channel,
      text: item.text,
      ...(revision ? { previousText: original.text } : {}),
    }
    const fingerprint = createHash('sha256').update(JSON.stringify(request)).digest('hex')
    if (revision) {
      await db.execute(sql`UPDATE insight_social_exports SET post_id=${item.postId},state='pending-revision',
        request=${JSON.stringify(request)}::jsonb,body_hash=${fingerprint},last_error=NULL,
        updated_at=GREATEST(date_trunc('milliseconds', now()),updated_at + interval '1 millisecond')
        WHERE id='b4f49e8e-7c40-4c27-9f7d-74cff104c502'`)
    } else {
      await db.execute(sql`INSERT INTO insight_social_exports (id,post_id,idempotency_key,body_hash,state,request)
        VALUES (${randomUUID()},${item.postId},${`linkedin-20261015-fr-${item.postId}-v1`},${fingerprint},'pending-preparation',${JSON.stringify(request)}::jsonb)
        ON CONFLICT (idempotency_key) DO NOTHING`)
    }
  }
}
export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error(
    'Keep the Buffer receipts; review social drafts explicitly instead of rolling back their history',
  )
}
