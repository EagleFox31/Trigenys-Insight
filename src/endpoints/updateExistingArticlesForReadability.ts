import type { Payload, PayloadRequest } from 'payload'

import {
  readabilityRevisions,
  type EditorialLocale,
} from '@/editorial/readability-revisions'

function comparableLocale(doc: any) {
  return {
    title: doc?.title || '',
    excerpt: doc?.excerpt || '',
    content: doc?.content || null,
    metaTitle: doc?.meta?.title || '',
    metaDescription: doc?.meta?.description || '',
  }
}

function comparableRevision(revision: {
  title: string
  excerpt: string
  content: unknown
  metaTitle: string
  metaDescription: string
}) {
  return {
    title: revision.title,
    excerpt: revision.excerpt,
    content: revision.content,
    metaTitle: revision.metaTitle,
    metaDescription: revision.metaDescription,
  }
}

export async function updateExistingArticlesForReadability({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}) {
  if (!req.user) {
    throw new Error('An authenticated editor is required to update editorial content.')
  }

  const results: Array<{
    id?: number
    slug: string
    status: 'updated' | 'unchanged' | 'missing'
    updatedLocales: EditorialLocale[]
    title?: string
  }> = []

  for (const revision of readabilityRevisions) {
    const found = await payload.find({
      collection: 'posts',
      depth: 0,
      draft: true,
      fallbackLocale: false,
      limit: 1,
      locale: 'fr',
      overrideAccess: false,
      req,
      where: { slug: { equals: revision.slug } },
    })

    const post = found.docs[0]

    if (!post) {
      results.push({
        slug: revision.slug,
        status: 'missing',
        updatedLocales: [],
      })
      continue
    }

    const updatedLocales: EditorialLocale[] = []
    const isPublished = post._status === 'published'

    for (const locale of ['fr', 'en'] as const) {
      const desired = revision.locales[locale]
      if (!desired) continue

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

      const hasChanged =
        JSON.stringify(comparableLocale(current)) !==
        JSON.stringify(comparableRevision(desired))

      if (!hasChanged) continue

      await payload.update({
        collection: 'posts',
        id: post.id,
        data: {
          _status: post._status,
          content: desired.content,
          excerpt: desired.excerpt,
          meta: {
            ...(current?.meta || {}),
            description: desired.metaDescription,
            title: desired.metaTitle,
          },
          readingTime: revision.readingTime ?? post.readingTime,
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

    results.push({
      id: post.id as number,
      slug: revision.slug,
      status: updatedLocales.length > 0 ? 'updated' : 'unchanged',
      updatedLocales,
      title: revision.locales.fr?.title || post.title || revision.slug,
    })
  }

  return results
}
