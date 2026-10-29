import { createHash } from 'node:crypto'
import type { PayloadRequest } from 'payload'
import { editorialRubrics, sectionForCategorySlug } from '@/editorial/rubrics'
import type {
  CategoryMergePlanInput,
  CategoryMergePlanResult,
} from '../../packages/insight-automation/src/schema'
import { EditorialError } from './errors'
import { relationIds } from './contentInspection'

// Strict dry-run. Do not rewrite category links, post versions or slugs here.
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

  const [latest, publicPosts, children] = await Promise.all([
    req.payload.find({
      collection: 'posts',
      where: { categories: { in: [input.sourceId] } },
      draft: true,
      depth: 0,
      pagination: false,
      limit: 0,
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
      limit: 0,
      locale: input.locale,
      overrideAccess: true,
      req,
    }),
    req.payload.find({
      collection: 'categories',
      where: { parent: { equals: input.sourceId } },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  ])

  const sourceRubric = sectionForCategorySlug(source.slug)
  const targetRubric = sectionForCategorySlug(target.slug)
  const matchingEditorialRubric = Boolean(
    sourceRubric && targetRubric && sourceRubric.id === targetRubric.id,
  )
  const protectedCanonical = editorialRubrics.some((item) => item.id === source.slug)
  const hasChildren = children.docs.length > 0
  const publishedPostIds = publicPosts.docs.filter((post) => post._status === 'published').map((post) => post.id).sort((a, b) => a - b)
  const latestNotDraft = latest.docs.some((post) => post._status !== 'draft')
  const fingerprint = createHash('sha256').update(JSON.stringify({
    source: [source.id, source.slug, source.updatedAt],
    target: [target.id, target.slug, target.updatedAt],
    latest: latest.docs.map((post) => [
      post.id, post.updatedAt, post._status, relationIds(post.categories),
    ]).sort((a, b) => Number(a[0]) - Number(b[0])),
    published: publishedPostIds,
    children: children.docs.map((child) => child.id).sort((a, b) => a - b),
  })).digest('hex')
  const reason = protectedCanonical
    ? 'source_is_canonical_editorial_rubric'
    : hasChildren
      ? 'source_has_nested_categories'
      : !matchingEditorialRubric
        ? 'categories_belong_to_different_rubrics_requires_editorial_review'
        : publishedPostIds.length > 0
          ? 'published_posts_require_separate_migration'
          : latestNotDraft
            ? 'category_contains_non_draft_revision'
            : null
  return {
    ok: true,
    fingerprint,
    source: { id: source.id, slug: source.slug, title: source.title },
    target: { id: target.id, slug: target.slug, title: target.title },
    affectedPostIds: latest.docs.map((post) => post.id),
    alreadyInTarget: latest.docs.filter((post) => relationIds(post.categories).includes(input.targetId)).map((post) => post.id),
    publishedPostIds,
    childCategoryIds: children.docs.map((category) => category.id),
    matchingEditorialRubric,
    canAutoMerge: reason === null,
    reason,
    projectedPostCount: latest.totalDocs,
    dryRun: true,
  }
}
