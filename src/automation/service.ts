import { executeBufferOperation } from '@/integrations/buffer/service'
import { socialArticleStatus } from '@/integrations/buffer/store'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { uploadOriginalSocialMedia } from './socialMediaUpload'
import { changePublicationSchedule, listPublicationSchedules } from './scheduling'
import { applySlugChange, planSlugChange, resolveAutomationSlugAlias } from './slugManagement'
import type { PayloadRequest } from 'payload'
import type { Post } from '@/payload-types'
import { createAutomationContent } from './content'
import { requireReferences, validateRelatedPosts } from './references'
import { listEditorialPosts } from './postInventory'
import { planCategoryMerge } from './categoryMergePreview'
import { applyCategoryMerge } from './categoryMergeApply'
import { createCategory, renameCategory } from './categoryManagement'
import { auditEditorialPosts } from './postAudit'
import { updateEditorialContent } from './updateContent'
import {
  type EditorialOperation,
  validateMarkers,
} from '../../packages/insight-automation/src/schema'

import { EditorialError } from './errors'
export { EditorialError } from './errors'
export const editorialSlug = (key: string) =>
  `editorial-os-${createHash('sha256').update(key).digest('hex').slice(0, 20)}`

export async function executeEditorialOperation(
  req: PayloadRequest,
  input: EditorialOperation,
): Promise<Record<string, unknown>> {
  if (
    input.operation === 'buffer-update-draft' ||
    input.operation === 'buffer-status' ||
    input.operation === 'buffer-create-draft' ||
    input.operation === 'buffer-list-posts' ||
    input.operation === 'buffer-schedule-post' ||
    input.operation === 'buffer-cancel-schedule'
  )
    return executeBufferOperation(req, input)
  const payload = req.payload
  if (input.operation === 'list-posts') return listEditorialPosts(req, input)
  if (input.operation === 'plan-slug-change') return planSlugChange(req, input)
  if (input.operation === 'apply-slug-change') return applySlugChange(req, input)
  if (input.operation === 'audit-posts') return auditEditorialPosts(req, input)
  if (input.operation === 'update-content') return updateEditorialContent(req, input)
  if (input.operation === 'list-schedules') return listPublicationSchedules(req, input)
  if (input.operation === 'plan-category-merge') return planCategoryMerge(req, input)
  if (input.operation === 'apply-category-merge') return applyCategoryMerge(req, input)
  if (input.operation === 'create-category') return createCategory(req, input)
  if (input.operation === 'rename-category') return renameCategory(req, input)
  if (input.operation === 'list-categories') {
    const result = await payload.find({
      collection: 'categories',
      limit: 1000,
      sort: 'title',
      depth: 0,
      locale: input.locale,
      overrideAccess: true,
      req,
    })
    return { ok: true, docs: result.docs.map(({ id, title, slug, updatedAt }) => ({ id, title, slug, updatedAt })) }
  }
  if (input.operation === 'list-authors') {
    const result = await payload.find({
      collection: 'users',
      limit: 1000,
      sort: 'id',
      depth: 0,
      overrideAccess: true,
      req,
    })
    return { ok: true, docs: result.docs.map(({ id, name }) => ({ id, name })) }
  }
  if (input.operation === 'upsert-source') {
    const { operation: _operation, ...data } = input
    const existing = await payload.find({
      collection: 'research-sources',
      where: { url: { equals: data.url } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const source = existing.docs[0]
      ? await payload.update({
          collection: 'research-sources',
          id: existing.docs[0].id,
          data,
          overrideAccess: true,
          req,
        })
      : await payload.create({ collection: 'research-sources', data, overrideAccess: true, req })
    return { ok: true, id: source.id }
  }
  if (input.operation === 'upload-media') {
    const data = Buffer.from(input.dataBase64, 'base64')
    if (!data.length || data.length > 3 * 1024 * 1024)
      throw new EditorialError(413, 'media_too_large')
    let metadata: sharp.Metadata
    try {
      metadata = await sharp(data, { limitInputPixels: 40000000 }).metadata()
    } catch {
      throw new EditorialError(422, 'invalid_image')
    }
    const formats = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp' }
    if (
      metadata.format !== formats[input.mimeType] ||
      !metadata.width ||
      !metadata.height ||
      (metadata.pages ?? 1) > 1
    ) {
      throw new EditorialError(422, 'invalid_image_type')
    }
    const extension = input.mimeType === 'image/jpeg' ? 'jpg' : formats[input.mimeType]
    const name = `automation-${createHash('sha256').update(data).update(input.alt).digest('hex')}.${extension}`
    if (
      metadata.width === 1080 &&
      metadata.height === 1350 &&
      process.env.BLOB_READ_WRITE_TOKEN?.trim()
    ) {
      if (/archive/i.test(input.filename))
        throw new EditorialError(422, 'social_asset_archived_or_missing')
      return uploadOriginalSocialMedia(req, {
        name,
        data,
        alt: input.alt,
        mimeType: input.mimeType,
      })
    }
    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: name } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (existing.docs[0])
      return { ok: true, id: existing.docs[0].id, url: existing.docs[0].url ?? null, reused: true }
    const media = await payload.create({
      collection: 'media',
      data: { alt: input.alt },
      file: { data, mimetype: input.mimeType, name, size: data.length },
      overrideAccess: true,
      req,
    })
    return { ok: true, id: media.id, url: media.url ?? null, reused: false }
  }
  const byID =
    input.operation === 'get-post' ||
    input.operation === 'update-post' ||
    input.operation === 'schedule-post' ||
    input.operation === 'cancel-schedule'
  if (byID && Boolean(input.idempotencyKey) === Boolean(input.postId))
    throw new EditorialError(400, 'provide_exactly_one_post_identifier')
  const slug = editorialSlug(input.idempotencyKey ?? '')
  const findOptions = {
    collection: 'posts' as const,
    limit: 1,
    depth: 0,
    draft: input.operation !== 'get-post' || input.version === 'latest',
    locale: input.locale,
    fallbackLocale: false as const,
    overrideAccess: true,
    req,
  }
  let existing = await payload.find({
    ...findOptions,
    where: byID && input.postId ? { id: { equals: input.postId } } : { slug: { equals: slug } },
  })
  // A stable automation key must continue to resolve after a human-readable
  // slug replaces the original editorial-os hash; Redirects stores the post ID.
  if (!existing.docs.length && input.idempotencyKey) {
    const aliasId = await resolveAutomationSlugAlias(req, slug)
    if (aliasId) {
      existing = await payload.find({ ...findOptions, where: { id: { equals: aliasId } } })
    }
  }
  if (input.operation === 'get-post') {
    const post = existing.docs[0]
    if (!post || (input.version === 'published' && post._status !== 'published'))
      throw new EditorialError(404, input.version === 'published' ? 'published_post_not_found' : 'post_not_found')
    const socialDistribution = await socialArticleStatus(req, post.id)
    return {
      ok: true,
      version: input.version,
      publicPath: input.version === 'published' ? `/${input.locale}/posts/${encodeURIComponent(post.slug)}` : null,
      post,
      ...(socialDistribution ? { socialDistribution } : {}),
    }
  }
  if (input.operation === 'schedule-post' || input.operation === 'cancel-schedule') {
    if (!existing.docs[0]) throw new EditorialError(404, 'post_not_found')
    return changePublicationSchedule(req, existing.docs[0], input)
  }
  if (input.operation === 'update-post') {
    const previous = existing.docs[0]
    if (!previous) throw new EditorialError(404, 'post_not_found')
    if (
      input.title === undefined &&
      input.excerpt === undefined &&
      input.seoDescription === undefined &&
      input.categories === undefined &&
      input.relatedPosts === undefined &&
      input.status === undefined
    ) {
      throw new EditorialError(400, 'empty_update')
    }
    if (
      input.expectedUpdatedAt &&
      Date.parse(input.expectedUpdatedAt) !== Date.parse(previous.updatedAt)
    ) {
      throw new EditorialError(409, 'stale_update')
    }
    if (input.categories) await requireReferences(req, 'categories', input.categories)
    const relatedPosts = await validateRelatedPosts(req, input.relatedPosts, previous.id)
    const data: Partial<Post> = {
      ...(relatedPosts !== undefined ? { relatedPosts } : {}),
      ...(input.status ? { _status: input.status === 'PUBLISHED' ? 'published' : 'draft' } : {}),
      ...(input.categories ? { categories: [...new Set(input.categories)] } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
      ...(input.seoDescription !== undefined
        ? { meta: { ...previous.meta, description: input.seoDescription } }
        : {}),
    }
    const stored = await payload.update({
      collection: 'posts',
      id: previous.id,
      data,
      locale: input.locale,
      fallbackLocale: false,
      draft: input.status ? input.status !== 'PUBLISHED' : previous._status !== 'published',
      depth: 0,
      overrideAccess: true,
      req,
    })
    return {
      ok: true,
      id: stored.id,
      slug: stored.slug,
      status: stored._status === 'published' ? 'PUBLISHED' : 'DRAFT',
      updatedAt: stored.updatedAt,
      url: stored._status === 'published' ? `/${input.locale}/posts/${stored.slug}` : null,
      relatedPosts: (stored.relatedPosts ?? []).map((post) =>
        typeof post === 'number' ? post : post.id,
      ),
    }
  }
  if (validateMarkers(input).length) throw new EditorialError(422, 'invalid_content_markers')

  const previous = existing.docs[0]
  let authors =
    input.authors ??
    previous?.authors?.map((author) => (typeof author === 'number' ? author : author.id))
  let categories =
    input.categories ??
    previous?.categories?.map((category) => (typeof category === 'number' ? category : category.id))
  // Compatibility for the original text-only Editorial OS contract.
  if (!authors?.length) {
    const result = await payload.find({
      collection: 'users',
      limit: 1,
      sort: 'id',
      depth: 0,
      overrideAccess: true,
      req,
    })
    authors = result.docs.map((doc) => doc.id)
  }
  if (!categories?.length) {
    const result = await payload.find({
      collection: 'categories',
      limit: 1,
      sort: 'id',
      depth: 0,
      overrideAccess: true,
      req,
    })
    categories = result.docs.map((doc) => doc.id)
  }
  if (!authors.length || !categories.length)
    throw new EditorialError(503, 'editorial_defaults_missing')
  // Validate every relationship before any writes; never accept arbitrary rich-text JSON.
  await requireReferences(req, 'users', authors)
  await requireReferences(req, 'categories', categories)
  await requireReferences(req, 'media', [
    ...(input.images ?? []).map((image) => image.media),
    ...(input.heroImage ? [input.heroImage] : []),
    ...(input.metadata?.seo?.image ? [input.metadata.seo.image] : []),
  ])
  await requireReferences(req, 'research-sources', input.sources ?? [])
  const relatedPosts = await validateRelatedPosts(req, input.relatedPosts, previous?.id)
  const seo = input.metadata?.seo
  const content = createAutomationContent(input)
  const document: Partial<Post> &
    Pick<Post, 'title' | 'excerpt' | 'content' | 'authors' | 'categories' | 'slug'> = {
    title: input.title,
    excerpt:
      input.excerpt ??
      input.body
        .replace(/\[\[(?:CHART|IMAGE):[^\]]+\]\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 320),
    content,
    slug: previous?.slug ?? slug,
    generateSlug: false,
    authors,
    categories,
    ...(relatedPosts !== undefined ? { relatedPosts } : {}),
    _status: input.operation === 'publish' ? 'published' : 'draft',
    ...(input.heroImage !== undefined ? { heroImage: input.heroImage } : {}),
    ...(seo
      ? {
          meta: {
            title: seo.title ?? seo.metaTitle,
            description: seo.description ?? seo.metaDescription,
            image: seo.image ?? input.heroImage,
          },
        }
      : {}),
    ...(input.sources !== undefined ? { sources: input.sources } : {}),
    ...(input.kind !== undefined ? { kind: input.kind } : {}),
    ...(input.readingTime !== undefined ? { readingTime: input.readingTime } : {}),
    ...(input.featured !== undefined ? { featured: input.featured } : {}),
    ...(input.editorsPick !== undefined ? { editorsPick: input.editorsPick } : {}),
    ...(input.keyTakeaways !== undefined ? { keyTakeaways: input.keyTakeaways } : {}),
    ...(input.faq !== undefined ? { faq: input.faq } : {}),
  }
  const options = {
    locale: input.locale,
    fallbackLocale: false as const,
    draft: input.operation === 'draft',
    depth: 0,
    overrideAccess: true,
    req,
  }
  let stored: Post
  try {
    stored = previous
      ? await payload.update({ collection: 'posts', id: previous.id, data: document, ...options })
      : await payload.create({ collection: 'posts', data: document, ...options })
  } catch (error) {
    // The DB unique slug index prevents duplicates if two first writes race.
    // The caller can retry the same key after the winning request commits.
    if (!previous) {
      const winner = await payload.find({
        collection: 'posts',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 0,
        draft: true,
        overrideAccess: true,
        req,
      })
      if (winner.docs.length) throw new EditorialError(409, 'concurrent_write_retry')
    }
    throw error
  }
  const publicPath = `/${input.locale}/posts/${stored.slug}`
  return {
    ok: true,
    id: stored.id,
    slug: stored.slug,
    status: input.operation === 'publish' ? 'PUBLISHED' : 'DRAFT',
    url: input.operation === 'publish' ? publicPath : null,
    // A plain public URL cannot preview drafts; use the authenticated editor.
    previewURL: input.operation === 'publish' ? publicPath : null,
    adminURL: `/admin/collections/posts/${stored.id}`,
    ownerKey: input.ownerKey,
    target: input.target,
  }
}
