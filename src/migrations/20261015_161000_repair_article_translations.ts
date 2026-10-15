import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { pipelineEnglish } from '../editorial/translations/pipeline-en-20261015'

// Owner-requested content repair. SQL updates only English locale rows so the
// unpublished French revision of post 35 (including its new media) stays intact.
// Payload's ordinary update reads the latest draft even for a published write,
// which would otherwise risk publishing that French revision as a side effect.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`SELECT id FROM posts WHERE id IN (1, 34, 35) ORDER BY id FOR UPDATE`)
  await db.execute(
    sql`SELECT id FROM _posts_v WHERE parent_id IN (1, 35) AND latest = true ORDER BY id FOR UPDATE`,
  )
  const guard = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) = 3 FROM posts WHERE
        (id = 1 AND slug = 'pipeline-ia-multi-agents-quatre-heures') OR
        (id = 34 AND slug = 'editorial-os-cfa2fe5303146b7eb16f') OR
        (id = 35 AND slug = 'editorial-os-75ebb8c36d8c1925637d')) AS identities_match,
      EXISTS (SELECT 1 FROM posts WHERE id = 1 AND updated_at = '2026-10-14T07:33:14.273Z'::timestamptz) AS source_unchanged,
      NOT EXISTS (SELECT 1 FROM _posts_v v JOIN _posts_v_locales vl ON vl._parent_id = v.id AND vl._locale = 'fr'
        JOIN posts_locales pl ON pl._parent_id = v.parent_id AND pl._locale = 'fr'
        WHERE v.parent_id = 1 AND v.latest = true AND (vl.version_content IS DISTINCT FROM pl.content OR vl.version_title IS DISTINCT FROM pl.title)) AS source_revision_matches,
      NOT EXISTS (SELECT 1 FROM _posts_v v JOIN _posts_v_locales vl ON vl._parent_id = v.id
        WHERE v.parent_id IN (1, 35) AND v.latest = true AND vl._locale = 'en'
        AND (length(coalesce(vl.version_title, '')) > 0 OR coalesce(jsonb_array_length(vl.version_content->'root'->'children'), 0) > 0)) AS draft_english_empty,
      EXISTS (SELECT 1 FROM posts_locales WHERE _parent_id = 34 AND _locale = 'en'
        AND title = 'E-commerce in Cameroon: Who Is Really Selling Online in 2026?'
        AND length(excerpt) > 0 AND jsonb_array_length(content->'root'->'children') > 0) AS source_exists,
      NOT EXISTS (SELECT 1 FROM posts_locales WHERE _parent_id IN (1, 35) AND _locale = 'en'
        AND (length(coalesce(title, '')) > 0 OR coalesce(jsonb_array_length(content->'root'->'children'), 0) > 0)) AS english_empty
  `)
  const checks = guard.rows[0]
  if (
    !checks?.identities_match ||
    !checks.source_exists ||
    !checks.source_unchanged ||
    !checks.source_revision_matches ||
    !checks.draft_english_empty ||
    !checks.english_empty
  )
    throw new Error('Translation repair precondition changed; no content was overwritten')

  await db.execute(sql`CREATE TEMP TABLE translation_repair_french_guard ON COMMIT DROP AS
    SELECT id, to_jsonb(pl) AS original FROM posts_locales pl WHERE _parent_id IN (1, 35) AND _locale = 'fr'`)
  await db.execute(sql`CREATE TEMP TABLE translation_repair_draft_guard ON COMMIT DROP AS
    SELECT vl.id, to_jsonb(vl) AS original FROM _posts_v_locales vl JOIN _posts_v v ON v.id = vl._parent_id
    WHERE v.parent_id IN (1, 35) AND v.latest = true AND vl._locale = 'fr'`)

  await db.execute(sql`INSERT INTO posts_locales (_parent_id, _locale, title, excerpt, content, meta_title, meta_description, meta_image_id)
    VALUES (1, 'en', ${pipelineEnglish.title}, ${pipelineEnglish.excerpt}, ${JSON.stringify(pipelineEnglish.content)}::jsonb,
      ${pipelineEnglish.metaTitle}, ${pipelineEnglish.metaDescription}, 1)
    ON CONFLICT (_locale, _parent_id) DO UPDATE SET title = EXCLUDED.title, excerpt = EXCLUDED.excerpt,
      content = EXCLUDED.content, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description,
      meta_image_id = EXCLUDED.meta_image_id`)
  await db.execute(sql`INSERT INTO posts_locales (_parent_id, _locale, title, excerpt, content, meta_title, meta_description, meta_image_id)
    SELECT 35, 'en', title, excerpt, content, meta_title, meta_description, meta_image_id
    FROM posts_locales WHERE _parent_id = 34 AND _locale = 'en'
    ON CONFLICT (_locale, _parent_id) DO UPDATE SET title = EXCLUDED.title, excerpt = EXCLUDED.excerpt,
      content = EXCLUDED.content, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description,
      meta_image_id = EXCLUDED.meta_image_id`)

  // Extend the latest saved versions too, without changing their statuses or
  // any French text, arrays, media, shared cover, slug or publication dates.
  await db.execute(sql`INSERT INTO _posts_v_locales (_parent_id, _locale, version_title, version_excerpt, version_content,
      version_meta_title, version_meta_description, version_meta_image_id)
    SELECT v.id, 'en', pl.title, pl.excerpt, pl.content, pl.meta_title, pl.meta_description, pl.meta_image_id
    FROM _posts_v v JOIN posts_locales pl ON pl._parent_id = v.parent_id AND pl._locale = 'en'
    WHERE v.parent_id IN (1, 35) AND v.latest = true
    ON CONFLICT (_locale, _parent_id) DO UPDATE SET version_title = EXCLUDED.version_title,
      version_excerpt = EXCLUDED.version_excerpt, version_content = EXCLUDED.version_content,
      version_meta_title = EXCLUDED.version_meta_title, version_meta_description = EXCLUDED.version_meta_description,
      version_meta_image_id = EXCLUDED.version_meta_image_id`)
  await db.execute(sql`UPDATE posts SET updated_at = now() WHERE id IN (1, 35)`)
  await db.execute(sql`UPDATE _posts_v SET updated_at = now(), version_updated_at = now()
    WHERE parent_id IN (1, 35) AND latest = true`)

  const preserved = await db.execute(sql`SELECT
    NOT EXISTS (SELECT 1 FROM translation_repair_french_guard g JOIN posts_locales pl ON pl.id = g.id WHERE to_jsonb(pl) <> g.original) AS french_preserved,
    NOT EXISTS (SELECT 1 FROM translation_repair_draft_guard g JOIN _posts_v_locales vl ON vl.id = g.id WHERE to_jsonb(vl) <> g.original) AS draft_preserved`)
  if (!preserved.rows[0]?.french_preserved || !preserved.rows[0]?.draft_preserved)
    throw new Error('Translation repair would change French content; transaction rolled back')
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error(
    'Content repair is forward-only; restore reviewed content explicitly instead of dropping translations',
  )
}
