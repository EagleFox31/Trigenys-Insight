import type { Payload, PayloadRequest } from 'payload'
import type { Post } from '@/payload-types'

import {
  createEditorialLexicalDocument,
  type EditorialLaunchArticle,
} from '@/editorial/editorial-launch-pack'
import { cloudflareContainersArticle } from '@/editorial/cloudflare-containers-cross-tenant'
import { dangoteLamuRefineryArticle } from '@/editorial/dangote-lamu-refinery'
import { kempinskiDoualaArticle } from '@/editorial/kempinski-douala'

const targetArticles: EditorialLaunchArticle[] = [
  cloudflareContainersArticle,
  dangoteLamuRefineryArticle,
  kempinskiDoualaArticle,
]

type EditorialLocale = 'fr' | 'en'

function comparableLocale(doc: Partial<Post> | null | undefined) {
  return {
    title: doc?.title || '',
    excerpt: doc?.excerpt || '',
    content: doc?.content || null,
    metaTitle: doc?.meta?.title || '',
    metaDescription: doc?.meta?.description || '',
  }
}

function comparableDesired(article: EditorialLaunchArticle, locale: EditorialLocale) {
  const desired = article[locale]

  return {
    title: desired.title,
    excerpt: desired.excerpt,
    content: createEditorialLexicalDocument(desired.content),
    metaTitle: desired.metaTitle,
    metaDescription: desired.metaDescription,
  }
}

function relationId(value: unknown): number | undefined {
  if (typeof value === 'number') return value

  if (
    value &&
    typeof value === 'object' &&
    'id' in value &&
    typeof (value as { id?: unknown }).id === 'number'
  ) {
    return (value as { id: number }).id
  }

  return undefined
}

async function ensureSources({
  payload,
  req,
  article,
}: {
  payload: Payload
  req: PayloadRequest
  article: EditorialLaunchArticle
}) {
  const sourceIds: number[] = []

  for (const source of article.sources) {
    const match = await payload.find({
      collection: 'research-sources',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: { url: { equals: source.url } },
    })

    const doc =
      match.docs[0] ??
      (await payload.create({
        collection: 'research-sources',
        data: source,
        depth: 0,
        overrideAccess: false,
        req,
      }))

    sourceIds.push(doc.id as number)
  }

  return sourceIds
}

export async function refreshSeptemberEditorialArticles({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}) {
  if (!req.user) {
    throw new Error('An authenticated editor is required to refresh editorial content.')
  }

  const results: Array<{
    id?: number
    slug: string
    status: 'updated' | 'unchanged' | 'missing'
    updatedLocales: EditorialLocale[]
    sourcesUpdated: boolean
    title?: string
  }> = []

  for (const article of targetArticles) {
    const found = await payload.find({
      collection: 'posts',
      depth: 0,
      draft: true,
      fallbackLocale: false,
      limit: 1,
      locale: 'fr',
      overrideAccess: false,
      req,
      where: { slug: { equals: article.slug } },
    })

    const post = found.docs[0]

    if (!post) {
      results.push({
        slug: article.slug,
        status: 'missing',
        updatedLocales: [],
        sourcesUpdated: false,
      })
      continue
    }

    const desiredSourceIds = await ensureSources({ payload, req, article })
    const currentSourceIds = (post.sources || [])
      .map((source) => relationId(source))
      .filter((id): id is number => typeof id === 'number')

    const mergedSourceIds = Array.from(new Set([...currentSourceIds, ...desiredSourceIds]))
    const sourcesUpdated = mergedSourceIds.length !== currentSourceIds.length
    const updatedLocales: EditorialLocale[] = []

    for (const locale of ['fr', 'en'] as const) {
      const current = await payload.findByID({
        collection: 'posts',
        id: post.id,
        depth: 0,
        draft: true,
        fallbackLocale: false,
        locale,
        overrideAccess: false,
        req,
      })

      const desired = comparableDesired(article, locale)
      const hasChanged =
        JSON.stringify(comparableLocale(current)) !== JSON.stringify(desired)

      if (!hasChanged) continue

      const isPublished = current?._status === 'published'

      await payload.update({
        collection: 'posts',
        id: post.id,
        data: {
          _status: isPublished ? 'published' : 'draft',
          content: desired.content,
          excerpt: desired.excerpt,
          meta: {
            ...(current?.meta || {}),
            description: desired.metaDescription,
            title: desired.metaTitle,
          },
          title: desired.title,
        },
        depth: 0,
        draft: !isPublished,
        fallbackLocale: false,
        locale,
        overrideAccess: false,
        req,
      })

      updatedLocales.push(locale)
    }

    if (sourcesUpdated) {
      const currentFr = await payload.findByID({
        collection: 'posts',
        id: post.id,
        depth: 0,
        draft: true,
        fallbackLocale: false,
        locale: 'fr',
        overrideAccess: false,
        req,
      })

      const isPublished = currentFr?._status === 'published'

      await payload.update({
        collection: 'posts',
        id: post.id,
        data: {
          _status: isPublished ? 'published' : 'draft',
          sources: mergedSourceIds,
        },
        depth: 0,
        draft: !isPublished,
        fallbackLocale: false,
        locale: 'fr',
        overrideAccess: false,
        req,
      })
    }

    results.push({
      id: post.id as number,
      slug: article.slug,
      status: updatedLocales.length > 0 || sourcesUpdated ? 'updated' : 'unchanged',
      updatedLocales,
      sourcesUpdated,
      title: article.fr.title,
    })
  }

  return results
}
