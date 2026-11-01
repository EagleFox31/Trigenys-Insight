import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS insight_article_view_settings (
      id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
      started_at timestamptz NOT NULL DEFAULT NOW()
    );
    INSERT INTO insight_article_view_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS insight_article_view_guards (
      post_id integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      fingerprint varchar(64) NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
      expires_at timestamptz NOT NULL,
      PRIMARY KEY (post_id, fingerprint)
    );
    CREATE INDEX IF NOT EXISTS insight_article_view_guards_expiry_idx
      ON insight_article_view_guards (expires_at);
    CREATE TABLE IF NOT EXISTS insight_article_views_daily (
      post_id integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      locale varchar(2) NOT NULL CHECK (locale IN ('fr', 'en')),
      day date NOT NULL,
      views bigint NOT NULL DEFAULT 0 CHECK (views >= 0),
      PRIMARY KEY (post_id, locale, day)
    );
    CREATE INDEX IF NOT EXISTS insight_article_views_daily_day_idx
      ON insight_article_views_daily (day, post_id);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // An automatic rollback must never discard collected statistics.
  await db.execute(sql`DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM insight_article_views_daily) THEN
      RAISE EXCEPTION 'Refusing to remove recorded article views';
    END IF;
  END $$;`)
  await db.execute(sql`
    DROP TABLE IF EXISTS insight_article_views_daily;
    DROP TABLE IF EXISTS insight_article_view_guards;
    DROP TABLE IF EXISTS insight_article_view_settings;
  `)
}
