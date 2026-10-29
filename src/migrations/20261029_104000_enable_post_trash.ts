import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

// Schema-only migration. Do NOT migrate any existing article to trash here.
// The column is nullable, so all existing articles remain active.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp(3) with time zone;
    CREATE INDEX IF NOT EXISTS "posts_deleted_at_idx" ON "posts" USING btree ("deleted_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  const archived = await db.execute(sql`SELECT COUNT(*)::int AS total FROM "posts" WHERE "deleted_at" IS NOT NULL`)
  if (Number(archived.rows[0]?.total) > 0)
    throw new Error('Restore all archived posts before removing the native trash column')
  await db.execute(sql`
    DROP INDEX IF EXISTS "posts_deleted_at_idx";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "deleted_at";
  `)
}
