import type { PayloadRequest } from 'payload'
import type { Post } from '@/payload-types'
import type {
  ArchivePlanInput,
  ArchivePlanResult,
  ArchivePostInput,
  RestorePostInput,
} from '../../packages/insight-automation/src/schema'
import { EditorialError } from './errors'
import { publicationJobsWhere, withPublicationLock } from './scheduling'

type TrashPost = Post & { deletedAt?: string | null }

// Native Payload trash keeps both localized content and the full versions history.
// Never emulate archive by writing draft:true: that leaves a public copy online.
export async function planPostArchive(
  req: PayloadRequest,
  input: ArchivePlanInput,
): Promise<ArchivePlanResult> {
  const base = {
    collection: 'posts' as const,
    where: { id: { equals: input.postId } },
    locale: 'fr' as const,
    fallbackLocale: false as const,
    depth: 0,
    limit: 1,
    trash: true,
    overrideAccess: true,
    req,
  }
  const [main, latest, jobs] = await Promise.all([
    req.payload.find({ ...base, draft: false }),
    req.payload.find({ ...base, draft: true }),
    req.payload.find({
      collection: 'payload-jobs',
      where: publicationJobsWhere(input.postId),
      limit: 100,
      depth: 0,
      overrideAccess: true,
      req,
    }),
  ])
  const post = main.docs[0] as TrashPost | undefined
  if (!post) throw new EditorialError(404, 'post_not_found')
  const revision = latest.docs[0]
  const isPublic = post._status === 'published'
  const archived = Boolean(post.deletedAt)
  const pendingPublications = jobs.totalDocs
  return {
    ok: true,
    postId: post.id,
    title: post.title,
    slug: post.slug,
    status: isPublic ? 'PUBLISHED' : 'DRAFT',
    isPublic,
    archived,
    deletedAt: post.deletedAt ?? null,
    expectedUpdatedAt: post.updatedAt,
    hasPendingDraft: isPublic && revision?._status === 'draft',
    pendingPublications,
    canArchive: archived || pendingPublications === 0,
    reason: archived ? null : pendingPublications ? 'post_has_pending_publication' : null,
  }
}

export async function archivePost(req: PayloadRequest, input: ArchivePostInput) {
  return withPublicationLock(req, async () => {
    const plan = await planPostArchive(req, input)
    if (plan.archived) return { ...plan, changed: false }
    if (Date.parse(plan.expectedUpdatedAt) !== Date.parse(input.expectedUpdatedAt))
      throw new EditorialError(409, 'stale_archive_plan')
    if (!plan.canArchive) throw new EditorialError(409, plan.reason ?? 'archive_blocked')
    // Payload's trash soft-delete writes deletedAt without deleting rows or versions.
    await req.payload.delete({
      collection: 'posts',
      id: input.postId,
      trash: true,
      overrideAccess: true,
      req,
    })
    const result = await planPostArchive(req, input)
    if (!result.archived) throw new EditorialError(409, 'archive_not_confirmed')
    return { ...result, changed: true }
  })
}

export async function restorePost(req: PayloadRequest, input: RestorePostInput) {
  return withPublicationLock(req, async () => {
    const plan = await planPostArchive(req, input)
    if (!plan.archived) return { ...plan, changed: false }
    if (!plan.deletedAt || Date.parse(plan.deletedAt) !== Date.parse(input.expectedDeletedAt))
      throw new EditorialError(409, 'stale_restore_plan')
    if (plan.isPublic && !input.allowPublicRestore)
      throw new EditorialError(409, 'restoration_would_republish_requires_confirmation')
    if (plan.pendingPublications)
      throw new EditorialError(409, 'post_has_pending_publication')
    // Native restore preserves the original public/draft status. Publication
    // therefore needs an explicit second opt-in for formerly public articles.
    await req.payload.update({
      collection: 'posts',
      id: input.postId,
      data: { deletedAt: null },
      trash: true,
      draft: false,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const result = await planPostArchive(req, input)
    if (result.archived) throw new EditorialError(409, 'restore_not_confirmed')
    return { ...result, changed: true }
  })
}
