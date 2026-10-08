export type NewsSitemapEntry = {
  loc: string
  language: 'fr' | 'en'
  publicationDate: string
  title: string
}

/**
 * When no posts have been published during Google's 48-hour News window,
 * older published articles may remain as ordinary <url> sitemap entries
 * WITHOUT <news:news>. Google explicitly documents this as supported.
 */
export type OrdinarySitemapEntry = {
  loc: string
  lastModified?: string
}

export const GOOGLE_NEWS_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000

export function isWithinGoogleNewsWindow(publicationDate: string, now = new Date()) {
  const publishedAt = new Date(publicationDate)

  if (Number.isNaN(publishedAt.getTime())) return false

  const age = now.getTime() - publishedAt.getTime()
  return age >= 0 && age <= GOOGLE_NEWS_MAX_AGE_MS
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildNewsSitemapXml(entries: NewsSitemapEntry[], fallback: OrdinarySitemapEntry[] = []) {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>Trigenys Insights</news:name>
        <news:language>${entry.language}</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(entry.publicationDate)}</news:publication_date>
      <news:title>${escapeXml(entry.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join('\n')

  // Google recommends only 48h-fresh posts carry News metadata. Preserve a
  // nonempty, valid generic sitemap during editorial gaps, but do not imply
  // older posts are fresh News. The normal posts sitemap remains unchanged.
  const ordinaryUrls = entries.length === 0
    ? fallback
        .slice(0, 20)
        .map((entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${entry.lastModified ? `
    <lastmod>${escapeXml(entry.lastModified)}</lastmod>` : ''}
  </url>`)
        .join('\n')
    : ''

  const content = urls || ordinaryUrls

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
>
${content}
</urlset>
`
}
