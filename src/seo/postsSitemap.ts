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
 * True when the localized public article route can actually render the post
 * (title, slug, excerpt and rich-text content in that locale).
 */
export function isPublicLocalizedPost<T extends PublicSitemapPost>(
  post: T,
): post is T & { title: string; slug: string; excerpt: string } {
  return (
    Boolean(post.title?.trim()) &&
    Boolean(post.slug?.trim()) &&
    Boolean(post.excerpt?.trim()) &&
    post.content !== null &&
    post.content !== undefined
  )
}

/**
 * Build canonical entries only for articles that the localized public route can
 * actually render.
 */
export function buildLocalizedPostSitemapEntries(
  locale: SiteLocale,
  posts: PublicSitemapPost[],
  fallbackDate = new Date().toISOString(),
) {
  return posts
    .filter(isPublicLocalizedPost)
    .map((post) => ({
      loc: absoluteCanonicalURL(`/${locale}/posts/${post.slug}`),
      lastmod: post.updatedAt || fallbackDate,
    }))
}
