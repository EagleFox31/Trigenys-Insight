import {
  initTransaction,
  commitTransaction,
  killTransaction,
  type PayloadRequest,
} from 'payload'
import type { Post } from '@/payload-types'
import type {
  CategoryMergeApplyInput,
  CategoryMergeApplyResult,
} from '../../packages/insight-automation/src/schema'
import { EditorialError } from './errors'
import { planCategoryMerge } from './categoryMergePreview'
import { withCategoryLock } from './categoryManagement'
import { relationIds } from './contentInspection'
import { publicationJobsWhere, withPublicationLock } from './scheduling'

// Reject publication side effects: the only public-content difference allowed
// is the exact category ID remapping. In particular, a published article's body,
// translated content, slug, hero image and publication date must not change.
function publicSignature(post: Post) {
  const {
    categories: _categories,
    updatedAt: _updatedAt,
    createdAt: _createdAt,
    ...protectedFields
  } = post
  return JSON.stringify(protectedFields)
}

async function postSnapshot(req: PayloadRequest, id: number, locale: 'fr' | 'en', draft: boolean) {
  const found = await req.payload.find({
    collection: 'posts',
    where: { id: { equals: id } },
    draft,
    locale,
    fallbackLocale: false,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  return found.docs[0] ?? null
}

function remapCategoryIds(original: number[], sourceId: number, targetId: number) {
  return [...new Set(original.map((id) => id === sourceId ? targetId : id))]
}

// Atomically migrate latest draft relationships and (only if explicitly opted
// in and no newer pending draft exists) live published relationships. Never
// update version-history records or permanently remove the source category.
export async function applyCategoryMerge(
  req: PayloadRequest,
  input: CategoryMergeApplyInput,
): Promise<CategoryMergeApplyResult> {
  const [first, second] = [input.sourceId, input.targetId].sort((a, b) => a - b)
  return withPublicationLock(req, () =>
    withCategoryLock(req, first, () =>
      withCategoryLock(req, second, async () => {
        const plan = await planCategoryMerge(req, input)
        if (plan.fingerprint !== input.expectedFingerprint)
          throw new EditorialError(409, 'stale_category_merge_plan')
        if (!plan.canAutoMerge)
          throw new EditorialError(409, plan.reason ?? 'category_merge_blocked')
        if (!plan.affectedPostIds.length)
          return { ...plan, dryRun: false as const, changed: false, updatedPostIds: [], retainedSourceCategory: true }

        const publicIds = new Set(plan.publishedPostIds)
        const ownsTransaction = await initTransaction(req)
        try {
          const updatedPostIds: number[] = []
          for (const id of plan.affectedPostIds) {
            const current = await postSnapshot(req, id, input.locale ?? 'fr', true)
            if (!current) throw new EditorialError(409, 'post_changed_during_category_merge')
            const isPublic = publicIds.has(id)
            if (current._status !== (isPublic ? 'published' : 'draft'))
              throw new EditorialError(409, 'post_revision_changed_during_category_merge')
            const originalIds = relationIds(current.categories)
            if (!originalIds.includes(input.sourceId))
              throw new EditorialError(409, 'category_relation_changed_during_merge')

            const remapped = remapCategoryIds(originalIds, input.sourceId, input.targetId)
            let publicBeforeFr: Post | null = null
            let publicBeforeEn: Post | null = null
            if (isPublic) {
              if (!input.includePublished) throw new EditorialError(409, 'published_merge_not_authorized')
              const pending = await req.payload.find({
                collection: 'payload-jobs',
                where: publicationJobsWhere(id),
                limit: 1,
                depth: 0,
                overrideAccess: true,
                req,
              })
              if (pending.docs.length)
                throw new EditorialError(409, 'post_has_pending_publication')
              publicBeforeFr = await postSnapshot(req, id, 'fr', false)
              publicBeforeEn = await postSnapshot(req, id, 'en', false)
              if (!publicBeforeFr || !publicBeforeEn ||
                  publicBeforeFr._status !== 'published' ||
                  publicBeforeEn._status !== 'published' ||
                  JSON.stringify(relationIds(publicBeforeFr.categories)) !== JSON.stringify(originalIds))
                throw new EditorialError(409, 'public_category_snapshot_diverged')
            }
            // For published posts this is only allowed after the preceding
            // comparison with the latest revision; draft:false cannot overwrite
            // an unpublished revision because such a post is blocked by preview.
            const updated = await req.payload.update({
              collection: 'posts',
              id,
              data: { categories: remapped, _status: isPublic ? 'published' : 'draft' },
              locale: input.locale,
              fallbackLocale: false,
              draft: !isPublic,
              depth: 0,
              overrideAccess: true,
              req,
            })
            if (updated._status !== (isPublic ? 'published' : 'draft') ||
                JSON.stringify(relationIds(updated.categories)) !== JSON.stringify(remapped))
              throw new EditorialError(409, 'post_category_merge_verification_failed')

            if (isPublic && publicBeforeFr && publicBeforeEn) {
              const [afterFr, afterEn] = await Promise.all([
                postSnapshot(req, id, 'fr', false),
                postSnapshot(req, id, 'en', false),
              ])
              if (!afterFr || !afterEn ||
                  publicSignature(publicBeforeFr) !== publicSignature(afterFr) ||
                  publicSignature(publicBeforeEn) !== publicSignature(afterEn) ||
                  JSON.stringify(relationIds(afterFr.categories)) !== JSON.stringify(remapped) ||
                  JSON.stringify(relationIds(afterEn.categories)) !== JSON.stringify(remapped))
                throw new EditorialError(409, 'published_content_changed_during_category_merge')
            }
            updatedPostIds.push(id)
          }
          if (ownsTransaction) await commitTransaction(req)
          return { ...plan, dryRun: false as const, changed: true, updatedPostIds, retainedSourceCategory: true }
        } catch (error) {
          if (ownsTransaction) await killTransaction(req)
          throw error
        }
      }),
    ),
  )
}
