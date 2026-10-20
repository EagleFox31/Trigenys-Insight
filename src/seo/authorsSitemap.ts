import { absoluteCanonicalURL } from '@/seo/structuredData'
import { isPublicLocalizedPost, type PublicSitemapPost } from '@/seo/postsSitemap'
import type { SiteLocale } from '@/i18n/config'
import { authorSlug } from '@/utilities/authorSlug'

export type PublicSitemapAuthorPost = PublicSitemapPost & {
  populatedAuthors?: Array<{ name?: string | null } | null> | null
}

/**
 * One canonical entry per public author profile. An author is listed only when
 * they sign at least one article the localized route can render, which is also
 * the condition for the profile page itself to return 200.
 */
export function buildLocalizedAuthorSitemapEntries(
  locale: SiteLocale,
  posts: PublicSitemapAuthorPost[],
  fallbackDate = new Date().toISOString(),
) {
  const lastmodBySlug = new Map<string, string>()

  for (const post of posts) {
    if (!isPublicLocalizedPost(post)) continue
    const updatedAt = post.updatedAt || fallbackDate

    for (const author of post.populatedAuthors || []) {
      const slug = author?.name ? authorSlug(author.name) : ''
      if (!slug) continue

      const current = lastmodBySlug.get(slug)
      if (!current || updatedAt > current) lastmodBySlug.set(slug, updatedAt)
    }
  }

  return [...lastmodBySlug.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, lastmod]) => ({
      loc: absoluteCanonicalURL(`/${locale}/authors/${slug}`),
      lastmod,
    }))
}
