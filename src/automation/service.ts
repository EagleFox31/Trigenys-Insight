import { createHash } from 'node:crypto'
import sharp from 'sharp'
import type { PayloadRequest } from 'payload'
import type { Post } from '@/payload-types'
import { createAutomationContent } from './content'
import {
  type EditorialOperation,
  validateMarkers,
} from '../../packages/insight-automation/src/schema'

export class EditorialError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code)
  }
}
export const editorialSlug = (key: string) =>
  `editorial-os-${createHash('sha256').update(key).digest('hex').slice(0, 20)}`

async function requireReferences(
  req: PayloadRequest,
  collection: 'users' | 'categories' | 'media' | 'research-sources',
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

export async function executeEditorialOperation(
  req: PayloadRequest,
  input: EditorialOperation,
): Promise<Record<string, unknown>> {
  const payload = req.payload
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
    return { ok: true, docs: result.docs.map(({ id, title, slug }) => ({ id, title, slug })) }
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
  const slug = editorialSlug(input.idempotencyKey)
  const existing = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    draft: true,
    locale: input.locale,
    fallbackLocale: false,
    overrideAccess: true,
    req,
  })
  if (input.operation === 'get-post') {
    if (!existing.docs[0]) throw new EditorialError(404, 'post_not_found')
    return { ok: true, post: existing.docs[0] }
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
    slug,
    authors,
    categories,
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
  const publicPath = `/${input.locale}/posts/${slug}`
  return {
    ok: true,
    id: stored.id,
    slug,
    status: input.operation === 'publish' ? 'PUBLISHED' : 'DRAFT',
    url: input.operation === 'publish' ? publicPath : null,
    // A plain public URL cannot preview drafts; use the authenticated editor.
    previewURL: input.operation === 'publish' ? publicPath : null,
    adminURL: `/admin/collections/posts/${stored.id}`,
    ownerKey: input.ownerKey,
    target: input.target,
  }
}
