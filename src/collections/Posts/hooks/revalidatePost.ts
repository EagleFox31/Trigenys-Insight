import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Post } from '../../../payload-types'
import { absoluteCanonicalURL } from '@/seo/structuredData'
import {
  collectLocalizedPostUrls,
  indexNowPostFingerprint,
  submitIndexNowUrls,
} from '@/seo/indexNow'
import { LLMS_CACHE_TAG } from '@/seo/llms'

function revalidateEditorialSitemaps() {
  revalidateTag('posts-sitemap', 'max')
  revalidateTag('news-sitemap', 'max')
  // Author profile URLs in the pages sitemap are derived from published posts.
  revalidateTag('pages-sitemap', 'max')
  revalidateTag(LLMS_CACHE_TAG, 'max')
}

// These are the public URLs, not just the legacy /posts route. Keep landing
// pages and article archives fresh when published content changes.
function revalidatePublicPostPaths(slug: string) {
  revalidatePath(`/posts/${slug}`)
  for (const locale of ['fr', 'en'] as const) {
    revalidatePath(`/${locale}/posts/${slug}`)
    revalidatePath(`/${locale}/posts`)
    revalidatePath(`/${locale}`)
  }
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
    const wasPublished = previousDoc._status === 'published'
    const isPublished = doc._status === 'published'

    if (isPublished || wasPublished) {
      if (isPublished && doc.slug) {
        payload.logger.info(`Revalidating published post: ${doc.slug}`)
        revalidatePublicPostPaths(doc.slug)
      }

      // Also invalidate the old canonical URLs after a rename or unpublish.
      if (wasPublished && previousDoc.slug && (!isPublished || previousDoc.slug !== doc.slug)) {
        revalidatePublicPostPaths(previousDoc.slug)
      }

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
    if (doc?.slug) revalidatePublicPostPaths(doc.slug)
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
