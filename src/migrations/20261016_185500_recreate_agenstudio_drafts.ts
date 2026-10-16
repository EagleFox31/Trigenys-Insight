import { createHash, randomUUID } from 'node:crypto'
import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import originals from '../editorial/social/20261016-linkedin.json'
import hashtags from '../editorial/social/20261016-linkedin-hashtags.json'

// Owner switched Buffer to AgenStudio and requested the twelve drafts again.
// A distinct pending state is ignored by the previous worker during deployment.
// The new worker resolves AgenStudio against live Buffer channels before creating
// only saveToDraft posts. Existing Trigenys receipts/posts are untouched.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const item of originals) {
    const selected = await db.execute(
      sql`SELECT id FROM posts WHERE id=${item.postId} AND _status='published'`,
    )
    if (!selected.rows.length)
      throw new Error('An article selected for AgenStudio is no longer public')
    const tags = hashtags.find((entry) => entry.postId === item.postId)?.hashtags
    if (!tags || tags.length !== 5) throw new Error('Missing reviewed social hashtags')
    const text = `${item.text}\n\n${tags.join(' ')}`
    if (text.length > 3000) throw new Error('AgenStudio draft exceeds the social text limit')
  }
  for (const item of originals) {
    const tags = hashtags.find((entry) => entry.postId === item.postId)!.hashtags
    const request = {
      postId: item.postId,
      locale: 'fr',
      targetChannelName: 'AgenStudio',
      text: `${item.text}\n\n${tags.join(' ')}`,
    }
    const body = JSON.stringify(request)
    const fingerprint = createHash('sha256').update(body).digest('hex')
    await db.execute(sql`INSERT INTO insight_social_exports (id,post_id,idempotency_key,body_hash,state,request)
      VALUES (${randomUUID()},${item.postId},${`agenstudio-recreate-20261016-fr-${item.postId}-v1`},${fingerprint},'pending-channel-draft',${body}::jsonb)
      ON CONFLICT (idempotency_key) DO NOTHING`)
  }
}
export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Keep the AgenStudio delivery receipts to prevent duplicate social drafts')
}
