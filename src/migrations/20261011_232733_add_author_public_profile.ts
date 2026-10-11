import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "users_profile_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "users_locales" (
  	"job_title" varchar,
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "users_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  ALTER TABLE "users_profile_links" ADD CONSTRAINT "users_profile_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_locales" ADD CONSTRAINT "users_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_texts" ADD CONSTRAINT "users_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_profile_links_order_idx" ON "users_profile_links" USING btree ("_order");
  CREATE INDEX "users_profile_links_parent_id_idx" ON "users_profile_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_locales_locale_parent_id_unique" ON "users_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "users_texts_order_parent" ON "users_texts" USING btree ("order","parent_id");
  CREATE INDEX "users_texts_locale_parent" ON "users_texts" USING btree ("locale","parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_profile_links" CASCADE;
  DROP TABLE "users_locales" CASCADE;
  DROP TABLE "users_texts" CASCADE;`)
}
