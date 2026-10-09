import { createHash, timingSafeEqual } from 'node:crypto'

import type { Endpoint } from 'payload'

import type { Post } from '@/payload-types'

const TOKEN_SHA256 = '823fc4481572586f035973801b493d85ba24f9df1489fe929fc088aff8953005'

type EditorialOSRequest = {
  operation: 'draft' | 'publish'
  idempotencyKey: string
  ownerKey: string
  target: string
  locale: 'fr' | 'en'
  title: string
  excerpt?: string | null
  body: string
  metadata?: Record<string, unknown>
}

const digest = (value: string): Buffer =>
  Buffer.from(createHash('sha256').update(value).digest('hex'), 'hex')

const authorized = (authorization: string | null): boolean => {
  if (!authorization?.startsWith('Bearer ')) return false

  const actual = digest(authorization.slice('Bearer '.length).trim())
  const expected = Buffer.from(TOKEN_SHA256, 'hex')

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

const lexicalDocument = (source: string) => {
  const blocks = source
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)

  return {
    root: {
      children: blocks.map((block) => ({
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: block,
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        type: 'paragraph',
        version: 1,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

const stableSlug = (idempotencyKey: string): string =>
  `editorial-os-${createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 20)}`

const metaFrom = (metadata: Record<string, unknown> | undefined) => {
  const seo = metadata?.seo
  if (!seo || typeof seo !== 'object' || Array.isArray(seo)) return undefined

  const value = seo as Record<string, unknown>
  const title =
    typeof value.title === 'string'
      ? value.title
      : typeof value.metaTitle === 'string'
        ? value.metaTitle
        : undefined
  const description =
    typeof value.description === 'string'
      ? value.description
      : typeof value.metaDescription === 'string'
        ? value.metaDescription
        : undefined

  if (!title && !description) return undefined
  return { title, description }
}

export const editorialOSEndpoint: Endpoint = {
  path: '/editorial-os',
  method: 'post',
  handler: async (req) => {
    if (!authorized(req.headers.get('authorization'))) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!req.json) {
      return Response.json({ error: 'invalid_json' }, { status: 400 })
    }

    let input: EditorialOSRequest
    try {
      input = (await req.json()) as EditorialOSRequest
    } catch {
      return Response.json({ error: 'invalid_json' }, { status: 400 })
    }

    if (
      !input ||
      !['draft', 'publish'].includes(input.operation) ||
      !input.idempotencyKey ||
      !input.ownerKey ||
      !input.target ||
      !['fr', 'en'].includes(input.locale) ||
      !input.title ||
      !input.body
    ) {
      return Response.json({ error: 'invalid_request' }, { status: 400 })
    }

    const slug = stableSlug(input.idempotencyKey)
    const existing = await req.payload.find({
      collection: 'posts',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })

    const authors = await req.payload.find({
      collection: 'users',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const categories = await req.payload.find({
      collection: 'categories',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (!authors.docs[0] || !categories.docs[0]) {
      return Response.json(
        { error: 'editorial_defaults_missing', message: 'A Payload author and category are required.' },
        { status: 503 },
      )
    }

    const document: Pick<
      Post,
      'title' | 'excerpt' | 'content' | 'slug' | 'authors' | 'categories' | '_status'
    > &
      Partial<Post> = {
      title: input.title,
      excerpt: (input.excerpt || input.body.replace(/\s+/g, ' ').trim()).slice(0, 320),
      content: lexicalDocument(input.body) as Post['content'],
      slug,
      authors: [authors.docs[0].id],
      categories: [categories.docs[0].id],
      meta: metaFrom(input.metadata) as Post['meta'],
      _status: input.operation === 'publish' ? 'published' : 'draft',
    }

    const existingDoc = existing.docs[0]
    let storedId: Post['id']

    if (existingDoc) {
      const stored = await req.payload.update({
        collection: 'posts',
        id: existingDoc.id,
        data: document,
        locale: input.locale,
        draft: input.operation === 'draft',
        overrideAccess: true,
      })
      storedId = stored.id
    } else {
      const stored = await req.payload.create({
        collection: 'posts',
        data: document,
        locale: input.locale,
        draft: input.operation === 'draft',
        overrideAccess: true,
      })
      storedId = stored.id
    }

    return Response.json({
      ok: true,
      id: storedId,
      slug,
      status: input.operation === 'publish' ? 'PUBLISHED' : 'DRAFT',
      url: input.operation === 'publish' ? `/${input.locale}/posts/${slug}` : null,
      previewURL: `/${input.locale}/posts/${slug}`,
      ownerKey: input.ownerKey,
      target: input.target,
    })
  },
}
