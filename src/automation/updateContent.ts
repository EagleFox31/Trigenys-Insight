import type { PayloadRequest } from 'payload'
import type { Post } from '@/payload-types'
import type {
  EditorialOperation,
  UpdatePostResult,
} from '../../packages/insight-automation/src/schema'
import { validateMarkers } from '../../packages/insight-automation/src/schema'
import { createAutomationContent } from './content'
import { asRecord, inspectContent, relationIds } from './contentInspection'
import { EditorialError } from './errors'
import { requireReferences, validateRelatedPosts } from './references'
import { withPublicationLock } from './scheduling'

export async function updateEditorialContent(
  req: PayloadRequest,
  input: Extract<EditorialOperation, { operation: 'update-content' }>,
): Promise<UpdatePostResult> {
  return withPublicationLock(req, async () => {
    const result = await req.payload.find({
      collection: 'posts',
      where: { id: { equals: input.postId } },
      limit: 1,
      locale: input.locale,
      fallbackLocale: false,
      draft: true,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const post = result.docs[0]
    if (!post) throw new EditorialError(404, 'post_not_found')
    if (Date.parse(input.expectedUpdatedAt) !== Date.parse(post.updatedAt))
      throw new EditorialError(409, 'stale_update')
    if (validateMarkers(input).length) throw new EditorialError(422, 'invalid_content_markers')
    const oldBlocks = inspectContent(post.content).blocks
    const retained = new Map<string, Post['content']['root']['children'][number]>()
    const retainedIds = new Set<string>()
    const paragraphs = input.body
      .trim()
      .split(/\n\s*\n/)
      .map((block) => block.trim())
    for (const item of input.retainedBlocks ?? []) {
      const block = oldBlocks.find((node) => asRecord(node.fields).id === item.blockId)
      if (!block) throw new EditorialError(422, 'retained_block_not_found')
      if (
        retained.has(item.marker) ||
        retainedIds.has(item.blockId) ||
        paragraphs.filter((p) => p === item.marker).length !== 1 ||
        input.body.split(item.marker).length !== 2
      )
        throw new EditorialError(422, 'invalid_retained_block_markers')
      retainedIds.add(item.blockId)
      retained.set(item.marker, block as Post['content']['root']['children'][number])
    }
    for (const match of input.body.matchAll(/\[\[BLOCK:[a-zA-Z0-9_-]+\]\]/g)) {
      if (!retained.has(match[0]))
        throw new EditorialError(422, 'missing_retained_block_definition')
    }
    if (
      !input.allowBlockRemoval &&
      oldBlocks.some((block) => !retainedIds.has(String(asRecord(block.fields).id ?? '')))
    )
      throw new EditorialError(422, 'embedded_blocks_require_explicit_replacement')
    await requireReferences(req, 'users', input.authors ?? [])
    await requireReferences(req, 'categories', input.categories ?? [])
    await requireReferences(req, 'media', [
      ...(input.images ?? []).map((image) => image.media),
      ...(input.heroImage ? [input.heroImage] : []),
      ...(input.metadata?.seo?.image ? [input.metadata.seo.image] : []),
    ])
    await requireReferences(req, 'research-sources', input.sources ?? [])
    const relatedPosts = await validateRelatedPosts(req, input.relatedPosts, post.id)
    const seo = input.metadata?.seo
    const data: Partial<Post> = {
      content: createAutomationContent(input, retained),
      _status: post._status,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.excerpt !== undefined ? { excerpt: input.excerpt ?? '' } : {}),
      ...(input.heroImage !== undefined ? { heroImage: input.heroImage } : {}),
      ...(input.authors !== undefined ? { authors: [...new Set(input.authors)] } : {}),
      ...(input.categories !== undefined ? { categories: [...new Set(input.categories)] } : {}),
      ...(relatedPosts !== undefined ? { relatedPosts } : {}),
      ...(input.sources !== undefined ? { sources: [...new Set(input.sources)] } : {}),
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.readingTime !== undefined ? { readingTime: input.readingTime } : {}),
      ...(input.featured !== undefined ? { featured: input.featured } : {}),
      ...(input.editorsPick !== undefined ? { editorsPick: input.editorsPick } : {}),
      ...(input.keyTakeaways !== undefined ? { keyTakeaways: input.keyTakeaways } : {}),
      ...(input.faq !== undefined ? { faq: input.faq } : {}),
      ...(seo
        ? {
            meta: {
              ...post.meta,
              ...(seo.title !== undefined || seo.metaTitle !== undefined
                ? { title: seo.title ?? seo.metaTitle }
                : {}),
              ...(seo.description !== undefined || seo.metaDescription !== undefined
                ? { description: seo.description ?? seo.metaDescription }
                : {}),
              ...(seo.image !== undefined ? { image: seo.image } : {}),
            },
          }
        : {}),
    }
    // _status is read under the publication worker's lock, never supplied by the caller.
    // Draft writes keep the live version intact; published edits stay published.
    const stored = await req.payload.update({
      collection: 'posts',
      id: post.id,
      data,
      locale: input.locale,
      fallbackLocale: false,
      draft: post._status !== 'published',
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
      relatedPosts: relationIds(stored.relatedPosts),
    }
  })
}
