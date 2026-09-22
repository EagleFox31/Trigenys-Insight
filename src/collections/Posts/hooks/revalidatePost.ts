import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Post } from '../../../payload-types'
import { absoluteCanonicalURL } from '@/seo/structuredData'
import {
  collectLocalizedPostUrls,
  indexNowPostFingerprint,
  submitIndexNowUrls,
} from '@/seo/indexNow'

function revalidateEditorialSitemaps() {
  revalidateTag('posts-sitemap', 'max')
  revalidateTag('news-sitemap', 'max')
}

async function getLocalizedPostUrls({
  payload,
  id,
  slug,
  draft = false,
}: {
  payload: Payload
  id: Post['id']
  slug: string
  draft?: boolean
}) {
  return collectLocalizedPostUrls({
    slug,
    loadLocale: async (locale) => {
      try {
        return await payload.findByID({
          collection: 'posts',
          id,
          depth: 0,
          draft,
          fallbackLocale: false,
          locale,
          overrideAccess: true,
        })
      } catch {
        return null
      }
    },
  })
}

async function notifyIndexNow(payload: Payload, urls: string[], reason: string) {
  const result = await submitIndexNowUrls(urls)

  if (result.status === 'submitted') {
    payload.logger.info(
      `IndexNow: submitted ${result.count} URL(s) after ${reason} (HTTP ${result.httpStatus})`,
    )
  }

  if (result.status === 'failed') {
    payload.logger.warn(
      `IndexNow: submission failed after ${reason}: ${result.error}${
        result.httpStatus ? ` (HTTP ${result.httpStatus})` : ''
      }`,
    )
  }
}

export const revalidatePost: CollectionAfterChangeHook<Post> = async ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published') {
      const path = `/posts/${doc.slug}`

      payload.logger.info(`Revalidating post at path: ${path}`)

      revalidatePath(path)
      revalidateEditorialSitemaps()
    }

    // If the post was previously published, we need to revalidate the old path
    if (previousDoc._status === 'published' && doc._status !== 'published') {
      const oldPath = `/posts/${previousDoc.slug}`

      payload.logger.info(`Revalidating old post at path: ${oldPath}`)

      revalidatePath(oldPath)
      revalidateEditorialSitemaps()
    }
  }

  if (!context.disableIndexNow) {
    const wasPublished = previousDoc._status === 'published'
    const isPublished = doc._status === 'published'
    const publicContentChanged =
      indexNowPostFingerprint(doc as unknown as Record<string, unknown>) !==
      indexNowPostFingerprint(previousDoc as unknown as Record<string, unknown>)

    if (isPublished && (!wasPublished || publicContentChanged)) {
      const urls = await getLocalizedPostUrls({
        payload,
        id: doc.id,
        slug: doc.slug,
      })

      if (wasPublished && previousDoc.slug && previousDoc.slug !== doc.slug) {
        urls.push(
          absoluteCanonicalURL(`/fr/posts/${previousDoc.slug}`),
          absoluteCanonicalURL(`/en/posts/${previousDoc.slug}`),
        )
      }

      await notifyIndexNow(payload, urls, wasPublished ? 'published update' : 'publication')
    }

    if (wasPublished && !isPublished) {
      const urls = await getLocalizedPostUrls({
        payload,
        id: doc.id,
        slug: previousDoc.slug || doc.slug,
        draft: true,
      })

      await notifyIndexNow(payload, urls, 'unpublish')
    }
  }

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = async ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const path = `/posts/${doc?.slug}`

    revalidatePath(path)
    revalidateEditorialSitemaps()
  }

  if (!context.disableIndexNow && doc?.slug) {
    await notifyIndexNow(
      payload,
      [
        absoluteCanonicalURL(`/fr/posts/${doc.slug}`),
        absoluteCanonicalURL(`/en/posts/${doc.slug}`),
      ],
      'delete',
    )
  }

  return doc
}
