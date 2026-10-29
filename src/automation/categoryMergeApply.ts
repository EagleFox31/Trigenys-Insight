import {
  initTransaction,
  commitTransaction,
  killTransaction,
  type PayloadRequest,
} from 'payload'
import type {
  CategoryMergeApplyInput,
  CategoryMergeApplyResult,
} from '../../packages/insight-automation/src/schema'
import { EditorialError } from './errors'
import { planCategoryMerge } from './categoryMergePreview'
import { withCategoryLock } from './categoryManagement'
import { relationIds } from './contentInspection'
import { withPublicationLock } from './scheduling'

// A category merge moves current draft relationships only. Never update a
// published Payload snapshot through draft:false: it could silently publish an
// unpublished revision. Published posts need a separate explicitly reviewed path.
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

        // Retain the source category and its historical relationships in
        // Payload versions. Never delete category IDs or rewrite version history.
        if (!plan.affectedPostIds.length)
          return { ...plan, dryRun: false as const, changed: false, updatedPostIds: [], retainedSourceCategory: true }

        const ownsTransaction = await initTransaction(req)
        try {
          const updatedPostIds: number[] = []
          for (const id of plan.affectedPostIds) {
            const existing = await req.payload.find({
              collection: 'posts',
              where: { id: { equals: id } },
              locale: input.locale,
              fallbackLocale: false,
              draft: true,
              depth: 0,
              limit: 1,
              overrideAccess: true,
              req,
            })
            const post = existing.docs[0]
            if (!post || post._status !== 'draft')
              throw new EditorialError(409, 'post_changed_during_category_merge')
            const originalIds = relationIds(post.categories)
            if (!originalIds.includes(input.sourceId))
              throw new EditorialError(409, 'category_relation_changed_during_merge')
            const remapped = [...new Set(originalIds.map((value) =>
              value === input.sourceId ? input.targetId : value,
            ))]
            // Categories is global, not localized: update once, maintaining
            // the original primary category position and all other relations.
            const updated = await req.payload.update({
              collection: 'posts',
              id,
              data: { categories: remapped, _status: 'draft' },
              locale: input.locale,
              fallbackLocale: false,
              draft: true,
              depth: 0,
              overrideAccess: true,
              req,
            })
            if (updated._status !== 'draft' ||
                JSON.stringify(relationIds(updated.categories)) !== JSON.stringify(remapped))
              throw new EditorialError(409, 'post_category_merge_verification_failed')
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
