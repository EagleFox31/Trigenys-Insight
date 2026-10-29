import { commitTransaction, initTransaction, killTransaction, type PayloadRequest } from 'payload'
import type { Post } from '@/payload-types'
import type {
  SlugApplyInput,
  SlugApplyResult,
  SlugPlanInput,
  SlugPlanResult,
} from '../../packages/insight-automation/src/schema'
import { EditorialError } from './errors'
import { publicationJobsWhere } from './scheduling'

const paths = (slug: string) => [
  `/posts/${slug}`,
  `/fr/posts/${slug}`,
  `/en/posts/${slug}`,
]

function targetId(record: { to?: { reference?: { relationTo?: string; value?: unknown } | null } }): number | null {
  const ref = record.to?.reference
  if (ref?.relationTo !== 'posts') return null
  const value = ref.value
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number')
    return value.id
  return null
}

// The old hashed slug is the original idempotency-key lookup. Reuse the
// existing Payload Redirects collection as a durable alias -> post ID registry.
export async function resolveAutomationSlugAlias(req: PayloadRequest, hashedSlug: string): Promise<number | null> {
  const found = await req.payload.find({
    collection: 'redirects',
    where: { from: { equals: `/fr/posts/${hashedSlug}` } },
    limit: 2,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (found.docs.length !== 1) return null
  return targetId(found.docs[0])
}

function publicSignature(post: Post) {
  // An update that unexpectedly republishes content instead of changing just the URL
  // must be rolled back. Compare the full content-bearing snapshot, not timestamps.
  const { slug: _slug, generateSlug: _generateSlug, updatedAt: _updated, createdAt: _created, ...rest } = post
  return JSON.stringify(rest)
}

export async function planSlugChange(req: PayloadRequest, input: SlugPlanInput): Promise<SlugPlanResult> {
  const recent = await req.payload.find({
    collection: 'posts',
    where: { id: { equals: input.postId } },
    draft: true,
    locale: 'fr',
    fallbackLocale: false,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  const post = recent.docs[0]
  if (!post) throw new EditorialError(404, 'post_not_found')
  const publicResult = await req.payload.find({
    collection: 'posts',
    where: { id: { equals: input.postId } },
    draft: false,
    locale: 'fr',
    fallbackLocale: false,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  const isPublic = publicResult.docs[0]?._status === 'published'
  const hasPendingRevision = isPublic && post._status !== 'published'
  const newPaths = paths(input.newSlug)
  const oldPaths = paths(post.slug)
  const collision = await req.payload.find({
    collection: 'posts',
    where: { slug: { equals: input.newSlug } },
    draft: true,
    depth: 0,
    limit: 2,
    overrideAccess: true,
    req,
  })
  const publishedCollision = await req.payload.find({
    collection: 'posts',
    where: { slug: { equals: input.newSlug } },
    draft: false,
    depth: 0,
    limit: 2,
    overrideAccess: true,
    req,
  })
  const reservedAlias = await req.payload.find({
    collection: 'redirects',
    where: { from: { in: newPaths } },
    limit: 4,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const conflictingPost = [...collision.docs, ...publishedCollision.docs].some((other) => other.id !== post.id)
  const differentSlug = post.slug !== input.newSlug
  // Old paths cannot already be somebody else's redirects.
  const oldAliases = differentSlug ? await req.payload.find({
    collection: 'redirects',
    where: { from: { in: oldPaths } },
    limit: 4,
    depth: 0,
    overrideAccess: true,
    req,
  }) : { docs: [] }
  const hijacked = oldAliases.docs.some((alias) => targetId(alias) !== post.id)
  const reason = !differentSlug ? null
    : hasPendingRevision ? 'post_has_pending_revision'
    : conflictingPost ? 'slug_already_used'
    : reservedAlias.docs.length > 0 ? 'slug_reserved_by_redirect'
    : hijacked ? 'old_slug_redirect_conflict'
    : null
  return {
    ok: true,
    postId: post.id,
    title: post.title,
    currentSlug: post.slug,
    newSlug: input.newSlug,
    expectedUpdatedAt: post.updatedAt,
    isPublic,
    hasPendingRevision,
    canApply: !reason,
    reason,
    oldPaths,
    newPaths,
  }
}

// A per-post PostgreSQL advisory lock stops two MCP renames from interleaving.
// This uses a separate pooled session, as does the existing publication scheduler.
async function withSlugLock<T>(req: PayloadRequest, postId: number, action: () => Promise<T>): Promise<T> {
  const connection = await req.payload.db.pool.connect()
  let locked = false
  try {
    const result = await connection.query('SELECT pg_try_advisory_lock(946322, $1) AS locked', [postId])
    locked = result.rows[0]?.locked === true
    if (!locked) throw new EditorialError(409, 'post_slug_change_busy_retry')
    return await action()
  } finally {
    if (locked) await connection.query('SELECT pg_advisory_unlock(946322, $1)', [postId])
    connection.release()
  }
}

export async function applySlugChange(req: PayloadRequest, input: SlugApplyInput): Promise<SlugApplyResult> {
  return withSlugLock(req, input.postId, async () => {
    const plan = await planSlugChange(req, input)
    if (plan.currentSlug !== input.expectedSlug ||
        Date.parse(plan.expectedUpdatedAt) !== Date.parse(input.expectedUpdatedAt))
      throw new EditorialError(409, 'stale_slug_plan')
    if (!plan.canApply) throw new EditorialError(409, plan.reason ?? 'slug_change_blocked')
    if (plan.currentSlug === plan.newSlug) return { ...plan, changed: false }

    const queued = await req.payload.find({
      collection: 'payload-jobs',
      where: publicationJobsWhere(input.postId),
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (queued.docs.length) throw new EditorialError(409, 'post_has_pending_publication')

    const before = await req.payload.find({
      collection: 'posts',
      where: { id: { equals: input.postId } },
      draft: !plan.isPublic,
      depth: 0,
      limit: 1,
      locale: 'fr',
      fallbackLocale: false,
      overrideAccess: true,
      req,
    })
    const snapshot = before.docs[0]
    if (!snapshot) throw new EditorialError(409, 'post_snapshot_missing')

    const ownsTransaction = await initTransaction(req)
    try {
      const oldAliases = await req.payload.find({
        collection: 'redirects',
        where: { from: { in: plan.oldPaths } },
        limit: 4,
        depth: 0,
        overrideAccess: true,
        req,
      })
      const existingPaths = new Set(oldAliases.docs.map((doc) => doc.from))
      if (oldAliases.docs.some((alias) => targetId(alias) !== input.postId))
        throw new EditorialError(409, 'old_slug_redirect_conflict')

      // Reference redirects always resolve to the newest slug, preventing chains.
      for (const oldPath of plan.oldPaths.filter((path) => !existingPaths.has(path))) {
        await req.payload.create({
          collection: 'redirects',
          data: {
            from: oldPath,
            to: { type: 'reference', reference: { relationTo: 'posts', value: input.postId } },
          },
          overrideAccess: true,
          req,
        })
      }
      const updated = await req.payload.update({
        collection: 'posts',
        id: input.postId,
        data: { slug: plan.newSlug, generateSlug: false },
        draft: !plan.isPublic,
        locale: 'fr',
        fallbackLocale: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
      if (updated.slug !== plan.newSlug ||
          (plan.isPublic && (updated._status !== 'published' || publicSignature(snapshot) !== publicSignature(updated))))
        throw new EditorialError(409, 'slug_change_did_not_preserve_public_content')

      if (ownsTransaction) await commitTransaction(req)
      return { ...plan, changed: true, expectedUpdatedAt: updated.updatedAt }
    } catch (error) {
      if (ownsTransaction) await killTransaction(req)
      throw error
    }
  })
}
