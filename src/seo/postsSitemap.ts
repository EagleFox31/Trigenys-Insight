import { absoluteCanonicalURL } from '@/seo/structuredData'
import type { SiteLocale } from '@/i18n/config'

export type PublicSitemapPost = {
  title?: string | null
  slug?: string | null
  excerpt?: string | null
  content?: unknown
  updatedAt?: string | null
}

/**
 * Build canonical entries only for articles that the localized public route can
 * actually render (title, excerpt and rich-text content in that locale).
 */
export function buildLocalizedPostSitemapEntries(
  locale: SiteLocale,
  posts: PublicSitemapPost[],
  fallbackDate = new Date().toISOString(),
) {
  return posts
    .filter(
      (post) =>
        Boolean(post.title?.trim()) &&
        Boolean(post.slug?.trim()) &&
        Boolean(post.excerpt?.trim()) &&
        post.content !== null &&
        post.content !== undefined,
    )
    .map((post) => ({
      loc: absoluteCanonicalURL(`/${locale}/posts/${post.slug}`),
      lastmod: post.updatedAt || fallbackDate,
    }))
}
