import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE TABLE insight_buffer_connection (
    id boolean PRIMARY KEY DEFAULT true CHECK (id = true), checked_at timestamptz NOT NULL DEFAULT now(),
    channels jsonb NOT NULL DEFAULT '[]'::jsonb, last_error text
  )`)
  await db.execute(sql`CREATE TABLE insight_social_exports (
    id uuid PRIMARY KEY, post_id integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    idempotency_key varchar(200) NOT NULL UNIQUE, body_hash varchar(64) NOT NULL,
    state varchar(30) NOT NULL, request jsonb NOT NULL, remote_post_id text UNIQUE, remote_status text,
    last_error text, attempts integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT date_trunc('milliseconds', now()), created_at timestamptz NOT NULL DEFAULT now()
  )`)
  await db.execute(
    sql`CREATE INDEX insight_social_exports_pending_idx ON insight_social_exports (state, created_at)`,
  )
  await db.execute(
    sql`CREATE INDEX insight_social_exports_post_idx ON insight_social_exports (post_id)`,
  )
  // One owner-authorized integration test. The worker will select a connected
  // Trigenys LinkedIn/Facebook channel, then create only a Buffer draft.
  // No schedule or public social post is requested by this migration.
  await db.execute(sql`INSERT INTO insight_social_exports (id, post_id, idempotency_key, body_hash, state, request)
    SELECT 'b4f49e8e-7c40-4c27-9f7d-74cff104c502', id, 'buffer-integration-draft-20261015', 'bootstrap',
      'pending-bootstrap', '{"postId":1,"locale":"fr","bootstrap":true}'::jsonb FROM posts
    WHERE id = 1 AND slug = 'pipeline-ia-multi-agents-quatre-heures' AND _status = 'published'`)
}
export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Buffer export receipts must be retained to prevent duplicate social posts')
}
