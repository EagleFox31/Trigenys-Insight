import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "reports_rels" ADD COLUMN "users_id" integer;
  ALTER TABLE "_reports_v_rels" ADD COLUMN "users_id" integer;
  ALTER TABLE "reports_rels" ADD CONSTRAINT "reports_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_reports_v_rels" ADD CONSTRAINT "_reports_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "_status_publishedAt_idx" ON "posts" USING btree ("_status","published_at");
  CREATE INDEX "version__status_version_publishedAt_idx" ON "_posts_v" USING btree ("version__status","version_published_at");
  CREATE INDEX "_status_reportDate_idx" ON "reports" USING btree ("_status","report_date");
  CREATE INDEX "reports_rels_users_id_idx" ON "reports_rels" USING btree ("users_id");
  CREATE INDEX "version__status_version_reportDate_idx" ON "_reports_v" USING btree ("version__status","version_report_date");
  CREATE INDEX "_reports_v_rels_users_id_idx" ON "_reports_v_rels" USING btree ("users_id");
  CREATE UNIQUE INDEX "research_sources_url_idx" ON "research_sources" USING btree ("url");
  CREATE INDEX "research_sources_accessed_at_idx" ON "research_sources" USING btree ("accessed_at");
  CREATE INDEX "newsletter_subscribers_locale_idx" ON "newsletter_subscribers" USING btree ("locale");`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "reports_rels" DROP CONSTRAINT "reports_rels_users_fk";

  ALTER TABLE "_reports_v_rels" DROP CONSTRAINT "_reports_v_rels_users_fk";

  DROP INDEX "_status_publishedAt_idx";
  DROP INDEX "version__status_version_publishedAt_idx";
  DROP INDEX "_status_reportDate_idx";
  DROP INDEX "reports_rels_users_id_idx";
  DROP INDEX "version__status_version_reportDate_idx";
  DROP INDEX "_reports_v_rels_users_id_idx";
  DROP INDEX "research_sources_url_idx";
  DROP INDEX "research_sources_accessed_at_idx";
  DROP INDEX "newsletter_subscribers_locale_idx";
  ALTER TABLE "reports_rels" DROP COLUMN "users_id";
  ALTER TABLE "_reports_v_rels" DROP COLUMN "users_id";`)
}
