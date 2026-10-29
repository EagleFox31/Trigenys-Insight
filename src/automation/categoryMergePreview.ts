import { createHash } from 'node:crypto'
import type { PayloadRequest } from 'payload'
import type { Post } from '@/payload-types'
import { editorialRubrics, sectionForCategorySlug } from '@/editorial/rubrics'
import type {
  CategoryMergePlanInput,
  CategoryMergePlanResult,
} from '../../packages/insight-automation/src/schema'
import { EditorialError } from './errors'
import { relationIds } from './contentInspection'

// Read both the current live snapshot AND the latest revision. Filtering only
// draft:true would silently skip a live article whose pending draft lost the
// source category; such a post must instead block a published migration.
export async function planCategoryMerge(
  req: PayloadRequest,
  input: CategoryMergePlanInput,
): Promise<CategoryMergePlanResult> {
  if (input.sourceId === input.targetId)
    throw new EditorialError(422, 'category_merge_identical_ids')

  const category = (id: number) => req.payload.find({
    collection: 'categories',
    where: { id: { equals: id } },
    limit: 1,
    depth: 0,
    locale: input.locale,
    fallbackLocale: false,
    overrideAccess: true,
    req,
  })
  const [sourceResult, targetResult] = await Promise.all([
    category(input.sourceId), category(input.targetId),
  ])
  const source = sourceResult.docs[0]
  const target = targetResult.docs[0]
  if (!source || !target) throw new EditorialError(404, 'category_not_found')

  const [latestBySource, publicBySource, children] = await Promise.all([
    req.payload.find({
      collection: 'posts',
      where: { categories: { in: [input.sourceId] } },
      draft: true,
      depth: 0,
      pagination: false,
      locale: input.locale,
      overrideAccess: true,
      req,
    }),
    req.payload.find({
      collection: 'posts',
      where: { categories: { in: [input.sourceId] } },
      draft: false,
      depth: 0,
      pagination: false,
      locale: input.locale,
      overrideAccess: true,
      req,
    }),
    req.payload.find({
      collection: 'categories',
      where: { parent: { equals: input.sourceId } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  ])

  const latestMap = new Map<number, Post>(latestBySource.docs.map((post) => [post.id, post]))
  const published = publicBySource.docs.filter((post) => post._status === 'published')
  const missingIds = published.map((post) => post.id).filter((id) => !latestMap.has(id))
  if (missingIds.length) {
    const additional = await req.payload.find({
      collection: 'posts',
      where: { id: { in: missingIds } },
      draft: true,
      depth: 0,
      pagination: false,
      locale: input.locale,
      overrideAccess: true,
      req,
    })
    for (const post of additional.docs) latestMap.set(post.id, post)
  }

  const latest = [...latestMap.values()].sort((a, b) => a.id - b.id)
  const publishedMap = new Map(published.map((post) => [post.id, post]))
  const publishedPostIds = published.map((post) => post.id).sort((a, b) => a - b)
  const sourceRubric = sectionForCategorySlug(source.slug)
  const targetRubric = sectionForCategorySlug(target.slug)
  const matchingEditorialRubric = Boolean(
    sourceRubric && targetRubric && sourceRubric.id === targetRubric.id,
  )
  const protectedCanonical = editorialRubrics.some((item) => item.id === source.slug)
  const pendingPublicDraft = published.some((pub) => {
    const post = latestMap.get(pub.id)
    return !post || post._status !== 'published' ||
      JSON.stringify(relationIds(post.categories)) !== JSON.stringify(relationIds(pub.categories))
  })
  const nonDraftLatest = latest.some((post) => !publishedMap.has(post.id) && post._status !== 'draft')
  const fingerprint = createHash('sha256').update(JSON.stringify({
    source: [source.id, source.slug, source.updatedAt],
    target: [target.id, target.slug, target.updatedAt],
    includePublished: input.includePublished,
    latest: latest.map((post) => [
      post.id, post.updatedAt, post._status, relationIds(post.categories),
    ]),
    public: published.map((post) => [
      post.id, post.updatedAt, relationIds(post.categories),
    ]).sort((a, b) => Number(a[0]) - Number(b[0])),
    children: children.docs.map((child) => child.id).sort((a, b) => a - b),
  })).digest('hex')
  const reason = protectedCanonical
    ? 'source_is_canonical_editorial_rubric'
    : children.docs.length
      ? 'source_has_nested_categories'
      : !matchingEditorialRubric
        ? 'categories_belong_to_different_rubrics_requires_editorial_review'
        : publishedPostIds.length && !input.includePublished
          ? 'published_posts_require_separate_migration'
          : pendingPublicDraft
            ? 'published_post_has_pending_revision'
            : nonDraftLatest
              ? 'category_contains_non_draft_revision'
              : null

  return {
    ok: true,
    fingerprint,
    includePublished: input.includePublished ?? false,
    source: { id: source.id, slug: source.slug, title: source.title },
    target: { id: target.id, slug: target.slug, title: target.title },
    affectedPostIds: latest.map((post) => post.id),
    alreadyInTarget: latest.filter((post) => relationIds(post.categories).includes(input.targetId)).map((post) => post.id),
    publishedPostIds,
    childCategoryIds: children.docs.map((child) => child.id),
    matchingEditorialRubric,
    canAutoMerge: reason === null,
    reason,
    projectedPostCount: latest.length,
    dryRun: true,
  }
}
