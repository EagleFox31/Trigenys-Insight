import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

// Second phase: run only after the bilingual page and permanent old-URL
// redirects have been deployed, so withdrawing the duplicate breaks no links.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  const oldURL = 'https://insight.trigenys.com/en/posts/editorial-os-cfa2fe5303146b7eb16f'
  const destination = '/en/posts/editorial-os-75ebb8c36d8c1925637d'
  const response = await fetch(oldURL, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  const location = response.headers.get('location')
  await response.body?.cancel()
  if (
    ![301, 308].includes(response.status) ||
    !location ||
    new URL(location, oldURL).pathname !== destination
  )
    throw new Error('Deploy the e-commerce redirect before archiving its duplicate')

  await db.execute(sql`SELECT id FROM posts WHERE id IN (34, 35) ORDER BY id FOR UPDATE`)
  const guard = await db.execute(sql`SELECT
    EXISTS (SELECT 1 FROM posts_locales source JOIN posts_locales target ON target._locale = source._locale
      WHERE source._parent_id = 34 AND source._locale = 'en' AND target._parent_id = 35
      AND length(source.title) > 0 AND source.title = target.title AND source.content = target.content
      AND source.excerpt IS NOT DISTINCT FROM target.excerpt
      AND source.meta_title IS NOT DISTINCT FROM target.meta_title
      AND source.meta_description IS NOT DISTINCT FROM target.meta_description
      AND source.meta_image_id IS NOT DISTINCT FROM target.meta_image_id) AS translation_copied,
    NOT EXISTS (SELECT 1 FROM _posts_v v JOIN _posts_v_locales vl ON vl._parent_id = v.id AND vl._locale = 'en'
      JOIN posts_locales pl ON pl._parent_id = v.parent_id AND pl._locale = 'en'
      WHERE v.parent_id = 34 AND v.latest = true
      AND (vl.version_content IS DISTINCT FROM pl.content OR vl.version_title IS DISTINCT FROM pl.title)) AS no_unmerged_revision,
    EXISTS (SELECT 1 FROM posts WHERE id = 35 AND slug = 'editorial-os-75ebb8c36d8c1925637d' AND _status = 'published') AS target_is_public`)
  if (
    !guard.rows[0]?.translation_copied ||
    !guard.rows[0]?.no_unmerged_revision ||
    !guard.rows[0]?.target_is_public
  )
    throw new Error('E-commerce content changed or target is not public; duplicate retained')

  // Keep all text, media, sources and historical versions. Remove only the
  // duplicate's public status; its content remains available in the CMS.
  await db.execute(sql`UPDATE posts SET _status = 'draft', updated_at = now() WHERE id = 34`)
  await db.execute(sql`UPDATE _posts_v SET version__status = 'draft', updated_at = now(), version_updated_at = now()
    WHERE parent_id = 34 AND latest = true`)

  await db.execute(
    sql`DELETE FROM posts_rels WHERE parent_id = 35 AND posts_id = 34 AND path = 'relatedPosts'`,
  )
  await db.execute(
    sql`UPDATE posts_rels SET posts_id = 35 WHERE posts_id = 34 AND path = 'relatedPosts'`,
  )
  await db.execute(sql`DELETE FROM posts_rels a USING posts_rels b WHERE a.id > b.id AND a.parent_id = b.parent_id
    AND a.path = b.path AND a.path = 'relatedPosts' AND a.posts_id = 35 AND b.posts_id = 35`)
  await db.execute(sql`DELETE FROM _posts_v_rels r USING _posts_v v WHERE r.parent_id = v.id AND v.parent_id = 35
    AND v.latest = true AND r.posts_id = 34 AND r.path IN ('relatedPosts', 'version.relatedPosts')`)
  await db.execute(sql`UPDATE _posts_v_rels r SET posts_id = 35 FROM _posts_v v WHERE r.parent_id = v.id
    AND v.latest = true AND r.posts_id = 34 AND r.path IN ('relatedPosts', 'version.relatedPosts')`)
  await db.execute(sql`DELETE FROM _posts_v_rels a USING _posts_v_rels b, _posts_v v WHERE a.id > b.id
    AND a.parent_id = b.parent_id AND a.parent_id = v.id AND v.latest = true
    AND a.path = b.path AND a.path IN ('relatedPosts', 'version.relatedPosts') AND a.posts_id = 35 AND b.posts_id = 35`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error(
    'Restore the archived article explicitly after reviewing canonical URLs; content was not deleted',
  )
}
