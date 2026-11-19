import type { SiteLocale } from '@/i18n/config'
import { sitePositioning } from '@/seo/positioning'
import { absoluteCanonicalURL, SITE_IDENTITY } from '@/seo/structuredData'

export type RssPost = {
  title?: string | null
  slug?: string | null
  excerpt?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
}

export function rssFeedPath(locale: SiteLocale) {
  return `/${locale}/feed.xml`
}

export function rssFeedTitle(locale: SiteLocale) {
  return locale === 'fr' ? `${SITE_IDENTITY.name} (français)` : `${SITE_IDENTITY.name} (English)`
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** RSS 2.0 feed of the latest published articles for one locale. */
export function buildRssFeed(locale: SiteLocale, posts: readonly RssPost[], limit = 25) {
  const items = posts
    .filter((post): post is RssPost & { title: string; slug: string; publishedAt: string } =>
      Boolean(post.title && post.slug && post.publishedAt),
    )
    .slice(0, limit)
  const homeURL = absoluteCanonicalURL(`/${locale}`)
  const lastBuild = items[0]?.updatedAt || items[0]?.publishedAt

  const itemXml = items
    .map((post) => {
      const url = absoluteCanonicalURL(`/${locale}/posts/${post.slug}`)
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`,
        post.excerpt ? `      <description>${escapeXml(post.excerpt)}</description>` : null,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(rssFeedTitle(locale))}</title>
    <link>${escapeXml(homeURL)}</link>
    <description>${escapeXml(sitePositioning(locale).description)}</description>
    <language>${locale === 'fr' ? 'fr-FR' : 'en'}</language>
    <atom:link href="${escapeXml(absoluteCanonicalURL(rssFeedPath(locale)))}" rel="self" type="application/rss+xml" />
${lastBuild ? `    <lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>\n` : ''}${itemXml}
  </channel>
</rss>
`
}
