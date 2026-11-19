import type { SiteLocale } from '@/i18n/config'
import { getLlmsIndexPosts } from '@/seo/llmsData'
import { buildRssFeed } from '@/seo/rss'

/** Shared GET handler for /fr/feed.xml and /en/feed.xml. */
export async function rssResponse(locale: SiteLocale) {
  let posts: Awaited<ReturnType<typeof getLlmsIndexPosts>>[SiteLocale] = []
  try {
    posts = (await getLlmsIndexPosts())[locale]
  } catch (error) {
    console.warn(`Trigenys Insights: RSS posts unavailable for locale ${locale}.`, error)
  }

  return new Response(buildRssFeed(locale, posts), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
    },
  })
}
