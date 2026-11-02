import { APIError, type CollectionBeforeChangeHook } from 'payload'
import type { Category } from '@/payload-types'

// This flag is passed only by the reviewed server-side retirement workflow.
// Payload REST and GraphQL clients cannot send Local API context options.
export const RETIREMENT_CONTEXT_KEY = 'verifiedCategoryRetirement'

/**
 * A read-only Admin field alone does not protect direct API writes.
 * Keep normal category edits and original null values working, but forbid
 * changing the retirement state without the confirmed MCP workflow.
 */
export const guardCategoryRetirementMetadata: CollectionBeforeChangeHook<Category> = ({
  data,
  originalDoc,
  req,
}) => {
  if (data.retiredAt === undefined) return data
  const before = originalDoc?.retiredAt ?? null
  const after = data.retiredAt ?? null
  if (before === after) return data
  if (req.context?.[RETIREMENT_CONTEXT_KEY] !== true) {
    throw new APIError('category_retirement_requires_reviewed_workflow', 403)
  }
  return data
}
