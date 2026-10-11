import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'

import { LLMS_CACHE_TAG, type LlmsPostsByLocale } from '@/seo/llms'

async function loadPublishedPosts(limit: number, withBody: boolean): Promise<LlmsPostsByLocale> {
  const payload = await getPayload({ config })
  const byLocale: LlmsPostsByLocale = { fr: [], en: [] }

  for (const locale of ['fr', 'en'] as const) {
    const results = await payload.find({
      collection: 'posts',
      overrideAccess: false,
      draft: false,
      depth: withBody ? 1 : 0,
      fallbackLocale: false,
      locale,
      limit,
      sort: '-publishedAt',
      where: {
        _status: {
          equals: 'published',
        },
      },
      // content is always selected: a post without localized content is not
      // served by the public route and must not be advertised.
      select: {
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        publishedAt: true,
        updatedAt: true,
        ...(withBody
          ? {
              categories: true,
              sources: true,
              populatedAuthors: true,
              authors: true,
              keyTakeaways: true,
              faq: true,
            }
          : {}),
      },
    })

    byLocale[locale] = results.docs
  }

  return byLocale
}

// Post hooks invalidate the tag on publish/unpublish; the TTL is a safety net
// for imports that bypass hooks.
export const getLlmsIndexPosts = unstable_cache(
  () => loadPublishedPosts(25, false),
  ['llms-index-v1'],
  { tags: [LLMS_CACHE_TAG], revalidate: 3600 },
)

export const getLlmsFullPosts = unstable_cache(
  () => loadPublishedPosts(40, true),
  ['llms-full-v1'],
  { tags: [LLMS_CACHE_TAG], revalidate: 3600 },
)
