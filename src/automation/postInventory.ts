import type { PayloadRequest, Where } from 'payload'
import type { Post } from '@/payload-types'
import type {
  EditorialOperation,
  ListPostsResult,
  PostSummary,
} from '../../packages/insight-automation/src/schema'
import { EditorialError } from './errors'
import { inspectContent, relationId, relationIds } from './contentInspection'

type ListInput = Extract<EditorialOperation, { operation: 'list-posts' | 'audit-posts' }>
export function postFilters(input: ListInput): Where {
  if (
    input.publishedAfter &&
    input.publishedBefore &&
    Date.parse(input.publishedAfter) > Date.parse(input.publishedBefore)
  )
    throw new EditorialError(422, 'invalid_publication_date_range')
  const and: Where[] = []
  if (input.status !== 'ANY')
    and.push({ _status: { equals: input.status === 'PUBLISHED' ? 'published' : 'draft' } })
  if (input.categoryId) and.push({ categories: { in: [input.categoryId] } })
  if (input.heroImage !== 'any') and.push({ heroImage: { exists: input.heroImage === 'present' } })
  if (input.search) and.push({ title: { like: input.search } })
  if (input.publishedAfter) and.push({ publishedAt: { greater_than_equal: input.publishedAfter } })
  if (input.publishedBefore) and.push({ publishedAt: { less_than_equal: input.publishedBefore } })
  if (input.operation === 'audit-posts' && input.postIds)
    and.push({ id: { in: [...new Set(input.postIds)] } })
  return and.length ? { and } : {}
}
export async function findEditorialPage(req: PayloadRequest, input: ListInput) {
  return req.payload.find({
    collection: 'posts',
    where: postFilters(input),
    locale: input.locale,
    fallbackLocale: false,
    draft: true,
    depth: 0,
    overrideAccess: true,
    req,
    page: input.page,
    limit: input.limit,
    sort: input.sort.includes('At') ? [input.sort, 'id'] : input.sort,
  })
}
export async function publicPostIds(req: PayloadRequest, ids: number[]): Promise<Set<number>> {
  if (!ids.length) return new Set()
  const current = await req.payload.find({
    collection: 'posts',
    where: { id: { in: ids } },
    draft: false,
    depth: 0,
    overrideAccess: true,
    req,
    pagination: false,
    limit: ids.length,
    select: { _status: true },
  })
  return new Set(current.docs.filter((post) => post._status === 'published').map((post) => post.id))
}
export function summarizePost(post: Post, isPublic: boolean): PostSummary {
  const content = inspectContent(post.content)
  const title = post.title?.trim() || null
  return {
    id: post.id,
    slug: post.slug,
    title,
    excerpt: post.excerpt || null,
    status: post._status === 'published' ? 'PUBLISHED' : 'DRAFT',
    isPublic,
    heroImage: relationId(post.heroImage),
    categories: relationIds(post.categories),
    authors: relationIds(post.authors),
    updatedAt: post.updatedAt,
    publishedAt: post.publishedAt ?? null,
    hasContent: content.hasContent,
    translationPresent: Boolean(title && content.hasContent),
    wordCount: content.wordCount,
  }
}
export async function listEditorialPosts(
  req: PayloadRequest,
  input: Extract<EditorialOperation, { operation: 'list-posts' }>,
): Promise<ListPostsResult> {
  const result = await findEditorialPage(req, input)
  const visible = await publicPostIds(
    req,
    result.docs.map((post) => post.id),
  )
  return {
    ok: true,
    locale: input.locale,
    view: 'latest',
    docs: result.docs.map((post) => summarizePost(post, visible.has(post.id))),
    totalDocs: result.totalDocs,
    page: result.page ?? input.page,
    limit: result.limit,
    totalPages: result.totalPages,
    hasNextPage: result.hasNextPage,
  }
}
