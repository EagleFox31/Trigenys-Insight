import { createHash } from 'node:crypto'
import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import originals from '../editorial/social/20261016-linkedin.json'
import additions from '../editorial/social/20261016-linkedin-hashtags.json'

// Requested copy-only revision of twelve existing LinkedIn drafts.
// Keep remote IDs and the existing copy; append five topic-specific hashtags.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  const revisions: { id: string; request: Record<string, unknown> }[] = []
  for (const item of additions) {
    const original = originals.find((draft) => draft.postId === item.postId)
    if (
      !original ||
      item.hashtags.length !== 5 ||
      item.hashtags.some((tag) => !/^#[A-Za-z0-9]+$/.test(tag))
    )
      throw new Error('Invalid hashtags or article selection')
    const text = `${original.text}\n\n${item.hashtags.join(' ')}`
    if (text.length > 3000) throw new Error('Hashtag revision exceeds LinkedIn limit')
    const result = await db.execute(sql`SELECT id, state, request FROM insight_social_exports
      WHERE post_id=${item.postId} AND remote_post_id=${item.bufferPostId} FOR UPDATE`)
    const row = result.rows[0]
    const request = row?.request as Record<string, unknown> | undefined
    if (!row || row.state !== 'draft' || !request || request.text !== original.text)
      throw new Error('A social draft changed; review before appending hashtags')
    revisions.push({
      id: String(row.id),
      request: { ...request, text, previousText: original.text },
    })
  }
  // Validate all twelve before changing any request. The migration transaction
  // and the worker's remote draft/text checks protect against concurrent edits.
  for (const item of revisions) {
    const body = JSON.stringify(item.request)
    const fingerprint = createHash('sha256').update(body).digest('hex')
    await db.execute(sql`UPDATE insight_social_exports SET state='pending-revision',request=${body}::jsonb,
      body_hash=${fingerprint},last_error=NULL,
      updated_at=GREATEST(date_trunc('milliseconds',now()),updated_at + interval '1 millisecond')
      WHERE id=${item.id}::uuid AND state='draft'`)
  }
}
export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Keep social revision receipts; revert copy explicitly if requested')
}
