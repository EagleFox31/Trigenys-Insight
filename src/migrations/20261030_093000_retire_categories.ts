import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

// Metadata-only migration: legacy category rows, slugs and historical relations
// are never removed or rewritten. No existing category is retired by default.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS retired_at timestamptz`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS categories_retired_at_idx
    ON categories (retired_at)`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Keep downgrade safe: refuse to discard actual retirement decisions.
  await db.execute(sql`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM categories WHERE retired_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Cannot remove category retirement state while archived categories exist';
      END IF;
    END $$;`)
  await db.execute(sql`DROP INDEX IF EXISTS categories_retired_at_idx`)
  await db.execute(sql`ALTER TABLE categories DROP COLUMN IF EXISTS retired_at`)
}
