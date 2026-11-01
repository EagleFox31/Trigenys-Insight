import { APIError, type CollectionBeforeChangeHook } from 'payload'
import type { Post } from '@/payload-types'
import { relationIds } from '@/automation/contentInspection'

/**
 * Historical versions may still reference a retired taxonomy ID. Preserve
 * those existing links on unrelated edits, but never permit a *new* link from
 * the Payload REST API, GraphQL, Admin UI, or a Local API caller.
 *
 * This complements the editor's filterOptions and automation's
 * requireReferences guard; UI filtering alone is not an authorization rule.
 */
export const guardRetiredCategories: CollectionBeforeChangeHook<Post> = async ({
  data, originalDoc, req,
}) => {
  if (data.categories === undefined) return data

  const incoming = relationIds(data.categories)
  const previous = new Set(relationIds(originalDoc?.categories))
  const newlyAssigned = incoming.filter((id) => !previous.has(id))
  if (!newlyAssigned.length) return data

  const retired = await req.payload.find({
    collection: 'categories',
    where: {
      and: [
        { id: { in: newlyAssigned } },
        { retiredAt: { exists: true } },
      ],
    },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (retired.docs.length) {
    throw new APIError(
      'retired_category_cannot_be_assigned',
      422,
      { categoryIds: retired.docs.map(({ id }) => id) },
      true,
    )
  }
  return data
}
