import type { PayloadRequest, Where } from 'payload'
import type { Post } from '@/payload-types'
import type {
  AuditIssue,
  AuditPostsResult,
  EditorialOperation,
} from '../../packages/insight-automation/src/schema'
import { chartSchema } from '../../packages/insight-automation/src/schema'
import {
  asRecord,
  inspectContent,
  relationId,
  relationIds,
  type JSONRecord,
} from './contentInspection'
import { findEditorialPage, publicPostIds } from './postInventory'

type Locale = 'fr' | 'en'
function validHTTPS(value: unknown): boolean {
  try {
    const url = new URL(String(value))
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}
function siteOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'https://insight.trigenys.com').origin
  } catch {
    return 'https://insight.trigenys.com'
  }
}
function internalSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value, siteOrigin())
    if (url.origin !== siteOrigin()) return null
    const match = url.pathname.match(/^\/(?:fr\/|en\/)?posts\/([^/]+)\/?$/)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}
function mediaReferences(post: Post): number[] {
  const ids = [relationId(post.heroImage), relationId(post.meta?.image)]
  for (const node of inspectContent(post.content).nodes) {
    const fields = asRecord(node.fields)
    if (node.type === 'block' && fields.blockType === 'mediaBlock')
      ids.push(relationId(fields.media))
    if (node.type === 'upload' && node.relationTo === 'media') ids.push(relationId(node.value))
  }
  return [...new Set(ids.filter((id): id is number => id !== null))]
}
async function loadReferences(
  req: PayloadRequest,
  collection: 'media' | 'research-sources' | 'posts',
  ids: number[],
  slugs: string[] = [],
) {
  const result = new Map<number, JSONRecord>()
  if (!ids.length && !slugs.length) return result
  // Bound each SQL IN list while retaining exact reference checks for this audit page.
  const count = Math.max(ids.length, slugs.length)
  for (let start = 0; start < count; start += 500) {
    const or: Where[] = []
    if (ids.slice(start, start + 500).length) or.push({ id: { in: ids.slice(start, start + 500) } })
    if (slugs.slice(start, start + 500).length)
      or.push({ slug: { in: slugs.slice(start, start + 500) } })
    const records = await req.payload.find({
      collection,
      where: { or },
      draft: false,
      depth: 0,
      overrideAccess: true,
      req,
      pagination: false,
      limit: 1000,
      ...(collection === 'posts' ? { select: { id: true, slug: true, _status: true } } : {}),
    })
    for (const doc of records.docs) result.set(doc.id, doc as unknown as JSONRecord)
  }
  return result
}

export async function auditEditorialPosts(
  req: PayloadRequest,
  input: Extract<EditorialOperation, { operation: 'audit-posts' }>,
): Promise<AuditPostsResult> {
  const page = await findEditorialPage(req, input)
  const ids = page.docs.map((post) => post.id)
  const otherLocale: Locale = input.locale === 'fr' ? 'en' : 'fr'
  const [translations, visible] = await Promise.all([
    ids.length
      ? req.payload.find({
          collection: 'posts',
          where: { id: { in: ids } },
          locale: otherLocale,
          fallbackLocale: false,
          draft: true,
          depth: 0,
          overrideAccess: true,
          req,
          pagination: false,
          limit: ids.length,
        })
      : Promise.resolve({ docs: [] as Post[] }),
    publicPostIds(req, ids),
  ])
  const byLocale: Record<Locale, Map<number, Post>> = {
    [input.locale]: new Map(page.docs.map((post) => [post.id, post])),
    [otherLocale]: new Map(translations.docs.map((post) => [post.id, post])),
  } as Record<Locale, Map<number, Post>>
  const all = [...page.docs, ...translations.docs]
  const mediaIds = new Set<number>(),
    sourceIds = new Set<number>(),
    targetIds = new Set<number>(),
    targetSlugs = new Set<string>()
  const checks = new Set(input.checks)
  for (const post of all) {
    if (checks.has('images')) for (const id of mediaReferences(post)) mediaIds.add(id)
    if (checks.has('sources')) for (const id of relationIds(post.sources)) sourceIds.add(id)
    if (checks.has('links')) {
      for (const id of relationIds(post.relatedPosts)) targetIds.add(id)
      for (const node of inspectContent(post.content).nodes) {
        if (node.type !== 'link' && node.type !== 'autolink') continue
        const fields = asRecord(node.fields),
          doc = asRecord(fields.doc)
        if (doc.relationTo === 'posts') {
          const id = relationId(doc.value)
          if (id) targetIds.add(id)
        }
        const slug = internalSlug(fields.url ?? node.url)
        if (slug) targetSlugs.add(slug)
      }
    }
  }
  const [media, sources, targets] = await Promise.all([
    loadReferences(req, 'media', [...mediaIds]),
    loadReferences(req, 'research-sources', [...sourceIds]),
    loadReferences(req, 'posts', [...targetIds], [...targetSlugs]),
  ])
  const targetsBySlug = new Map([...targets.values()].map((post) => [String(post.slug), post]))
  const docs: AuditPostsResult['docs'] = page.docs.map((post) => {
    const issues: AuditIssue[] = []
    const add = (
      code: string,
      severity: AuditIssue['severity'],
      field: string,
      message: string,
      locale?: Locale,
    ) => {
      if (
        !issues.some((item) => item.code === code && item.field === field && item.locale === locale)
      )
        issues.push({ code, severity, field, message, ...(locale ? { locale } : {}) })
    }
    const inspectLocale = (locale: Locale) => {
      const doc = byLocale[locale].get(post.id)
      const content = inspectContent(doc?.content)
      const hasTitle = Boolean(doc?.title?.trim())
      if (checks.has('translations')) {
        if (!hasTitle)
          add(
            'translation_title_missing',
            'error',
            'title',
            'Le titre est absent dans cette langue.',
            locale,
          )
        if (!content.hasContent)
          add(
            'translation_body_missing',
            'error',
            'content',
            'Le corps de l’article est absent dans cette langue.',
            locale,
          )
        if (!doc?.excerpt?.trim())
          add(
            'translation_excerpt_missing',
            'warning',
            'excerpt',
            'Le résumé est absent dans cette langue.',
            locale,
          )
      }
      if (checks.has('structure')) {
        if (!hasTitle) add('title_missing', 'error', 'title', 'Le titre est vide.', locale)
        if (!content.hasContent)
          add('body_missing', 'error', 'content', 'Le corps est vide.', locale)
        if (content.hasContent && !content.text)
          add(
            'body_has_no_text',
            'warning',
            'content',
            'Le corps contient des blocs mais aucun texte rédigé.',
            locale,
          )
        if (content.nodes.some((node) => node.type === 'heading' && node.tag === 'h1'))
          add(
            'body_contains_h1',
            'warning',
            'content',
            'Un H1 figure dans le corps ; le titre de la page fournit déjà le H1.',
            locale,
          )
        if (/\[\[(?:CHART|IMAGE|BLOCK):[^\]]+\]\]/.test(content.text))
          add(
            'unresolved_content_marker',
            'error',
            'content',
            'Un marqueur de graphique, média ou bloc est resté dans le texte.',
            locale,
          )
        for (const block of content.blocks) {
          const fields = asRecord(block.fields)
          if (fields.blockType === 'chart') {
            const parsed = chartSchema.safeParse({
              marker: '[[CHART:audit]]',
              title: fields.title,
              description: fields.description,
              sourceLabel: fields.sourceLabel,
              sourceUrl: fields.sourceUrl,
              metrics: Array.isArray(fields.metrics)
                ? fields.metrics.map((metric) => {
                    const m = asRecord(metric)
                    return {
                      label: m.label,
                      unit: m.unit,
                      precision: m.precision,
                      points: Array.isArray(m.points)
                        ? m.points.map((point) => {
                            const p = asRecord(point)
                            return { label: p.label, value: p.value }
                          })
                        : m.points,
                    }
                  })
                : fields.metrics,
            })
            if (!parsed.success)
              add(
                'chart_invalid',
                'error',
                `content.${String(fields.id ?? 'chart')}`,
                'Un graphique a des champs manquants ou des données incompatibles avec le schéma.',
                locale,
              )
          }
        }
      }
      if (!doc || (!hasTitle && !content.hasContent))
        return { hasTitle, hasContent: content.hasContent, wordCount: content.wordCount }
      if (checks.has('seo')) {
        if (!doc.meta?.title?.trim())
          add(
            'seo_title_missing',
            'warning',
            'meta.title',
            'Le titre SEO explicite est absent.',
            locale,
          )
        if (!doc.meta?.description?.trim())
          add(
            'seo_description_missing',
            'warning',
            'meta.description',
            'La description SEO explicite est absente.',
            locale,
          )
        if ((doc.meta?.title?.length ?? 0) > 70)
          add(
            'seo_title_long',
            'warning',
            'meta.title',
            'Le titre SEO dépasse le repère indicatif de 70 caractères.',
            locale,
          )
        if ((doc.meta?.description?.length ?? 0) > 180)
          add(
            'seo_description_long',
            'warning',
            'meta.description',
            'La description SEO dépasse le repère indicatif de 180 caractères.',
            locale,
          )
      }
      if (checks.has('sources')) {
        const sourceIDs = relationIds(doc.sources)
        if (!sourceIDs.length)
          add(
            'sources_missing',
            'warning',
            'sources',
            'Aucune source documentaire structurée n’est associée.',
            locale,
          )
        for (const id of sourceIDs) {
          const source = sources.get(id)
          if (!source)
            add(
              'source_reference_missing',
              'error',
              `sources.${id}`,
              'La source référencée n’existe plus.',
              locale,
            )
          else if (!validHTTPS(source.url))
            add(
              'source_url_invalid',
              'warning',
              `sources.${id}.url`,
              'La source n’a pas d’URL HTTPS valide sans identifiants.',
              locale,
            )
        }
      }
      if (checks.has('images')) {
        if (!relationId(doc.heroImage))
          add(
            'hero_image_missing',
            'warning',
            'heroImage',
            'L’image de couverture est absente.',
            locale,
          )
        for (const id of mediaReferences(doc)) {
          const image = media.get(id)
          if (!image)
            add(
              'media_reference_missing',
              'error',
              `media.${id}`,
              'Le média référencé n’existe plus.',
              locale,
            )
          else {
            if (typeof image.alt !== 'string' || !image.alt.trim())
              add(
                'image_alt_missing',
                'warning',
                `media.${id}.alt`,
                'Le média n’a pas de description alternative.',
                locale,
              )
            if (typeof image.mimeType === 'string' && !image.mimeType.startsWith('image/'))
              add(
                'media_not_image',
                'warning',
                `media.${id}`,
                'Le média utilisé n’est pas déclaré comme une image.',
                locale,
              )
          }
        }
      }
      if (checks.has('links')) {
        const checkTarget = (target: JSONRecord | undefined, field: string) => {
          if (!target)
            add('internal_post_missing', 'error', field, 'L’article lié n’existe pas.', locale)
          else if (target._status !== 'published')
            add(
              'internal_post_not_public',
              'warning',
              field,
              'L’article lié n’est pas publié.',
              locale,
            )
          else if (target.id === post.id)
            add(
              'self_related_or_linked_post',
              'warning',
              field,
              'L’article se référence lui-même.',
              locale,
            )
        }
        for (const id of relationIds(doc.relatedPosts))
          checkTarget(targets.get(id), `relatedPosts.${id}`)
        for (const node of content.nodes) {
          if (node.type !== 'link' && node.type !== 'autolink') continue
          const fields = asRecord(node.fields),
            relation = asRecord(fields.doc)
          if (relation.relationTo === 'posts') {
            const id = relationId(relation.value)
            if (id) checkTarget(targets.get(id), `content.link.post.${id}`)
            continue
          }
          const raw = fields.url ?? node.url
          if (typeof raw !== 'string') continue
          try {
            const url = new URL(raw, siteOrigin())
            if (
              !['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ||
              url.username ||
              url.password
            )
              add(
                'unsafe_link',
                'error',
                'content.links',
                'Un lien utilise un protocole non pris en charge ou contient des identifiants.',
                locale,
              )
            else if (url.protocol === 'http:')
              add(
                'non_https_link',
                'warning',
                'content.links',
                'Un lien web n’utilise pas HTTPS.',
                locale,
              )
          } catch {
            add('invalid_link', 'error', 'content.links', 'Un lien a une URL invalide.', locale)
          }
          const slug = internalSlug(raw)
          if (slug) checkTarget(targetsBySlug.get(slug), `content.link.slug.${slug}`)
        }
      }
      return { hasTitle, hasContent: content.hasContent, wordCount: content.wordCount }
    }
    const locales = { fr: inspectLocale('fr'), en: inspectLocale('en') }
    if (checks.has('translations')) {
      const fr = inspectContent(byLocale.fr.get(post.id)?.content),
        en = inspectContent(byLocale.en.get(post.id)?.content)
      if (fr.text.length >= 80 && fr.text === en.text)
        add(
          'translations_identical',
          'warning',
          'content',
          'Les textes français et anglais sont identiques ; une relecture de traduction est nécessaire.',
        )
      if (locales.fr.hasContent && locales.en.hasContent && fr.blocks.length !== en.blocks.length)
        add(
          'translation_blocks_differ',
          'warning',
          'content',
          'Le nombre de blocs intégrés diffère entre les versions ; vérifier que ce choix est volontaire.',
        )
    }
    if (checks.has('structure')) {
      if (!post.slug?.trim()) add('slug_missing', 'error', 'slug', 'Le slug est absent.')
      if (!relationIds(post.authors).length)
        add('authors_missing', 'error', 'authors', 'Aucun auteur n’est associé.')
      if (!relationIds(post.categories).length)
        add('categories_missing', 'error', 'categories', 'Aucune catégorie n’est associée.')
    }
    return {
      id: post.id,
      slug: post.slug,
      title: post.title || null,
      status: post._status === 'published' ? 'PUBLISHED' : 'DRAFT',
      isPublic: visible.has(post.id),
      passesAutomatedChecks: !issues.some((issue) => issue.severity === 'error'),
      issues,
      locales,
    }
  })
  const issuesByCode: Record<string, number> = {}
  for (const doc of docs)
    for (const issue of doc.issues) issuesByCode[issue.code] = (issuesByCode[issue.code] ?? 0) + 1
  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    scope: 'current_page',
    editorialApprovalRequired: true,
    externalAvailabilityChecked: false,
    factsVerified: false,
    totalDocs: page.totalDocs,
    page: page.page ?? input.page,
    limit: page.limit,
    totalPages: page.totalPages,
    hasNextPage: page.hasNextPage,
    summary: {
      scanned: docs.length,
      articlesWithErrors: docs.filter((doc) =>
        doc.issues.some((issue) => issue.severity === 'error'),
      ).length,
      articlesWithWarnings: docs.filter((doc) =>
        doc.issues.some((issue) => issue.severity === 'warning'),
      ).length,
      issuesByCode,
    },
    docs,
  }
}
