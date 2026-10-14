import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE insight_oauth_records (
      key varchar(200) PRIMARY KEY, kind varchar(20) NOT NULL,
      data jsonb NOT NULL, expires_at timestamptz NOT NULL,
      used_at timestamptz, created_at timestamptz NOT NULL DEFAULT NOW()
    );
    CREATE INDEX insight_oauth_expiry_idx ON insight_oauth_records (expires_at);
    CREATE TABLE insight_oauth_rate_limits (key varchar(100) PRIMARY KEY, count integer NOT NULL, window_start timestamptz NOT NULL);
  `)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE insight_oauth_rate_limits; DROP TABLE insight_oauth_records;`)
}
