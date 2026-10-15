import type { PayloadRequest } from 'payload'
import { EditorialError } from './errors'

export async function requireReferences(
  req: PayloadRequest,
  collection: 'users' | 'categories' | 'media' | 'research-sources' | 'posts',
  ids: number[],
) {
  if (!ids.length) return
  const result = await req.payload.find({
    collection,
    where: { id: { in: [...new Set(ids)] } },
    limit: ids.length,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const found = new Set(result.docs.map((doc) => doc.id))
  if (ids.some((id) => !found.has(id)))
    throw new EditorialError(422, `invalid_${collection}_reference`)
}
export async function validateRelatedPosts(
  req: PayloadRequest,
  ids: number[] | undefined,
  ownId?: number,
) {
  if (ids === undefined) return undefined
  const unique = [...new Set(ids)]
  if (ownId !== undefined && unique.includes(ownId))
    throw new EditorialError(422, 'self_related_post')
  await requireReferences(req, 'posts', unique)
  return unique
}
