// Pure, dependency-free SEO assertions on rendered HTML and sitemap XML.
// Shared by the live crawl smoke (scripts/seo/public-crawl-smoke.mjs) and the
// unit tests (tests/unit/seoChecks.spec.ts), so CI and production checks
// enforce the same contract.

/** @param {string} html */
export function documentWithoutScripts(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
}

/** @param {string} xml */
export function sitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    match[1].replace(/&amp;/g, '&'),
  )
}

/** Number of <h1> elements outside scripts. @param {string} html */
export function countH1(html) {
  return (documentWithoutScripts(html).match(/<h1\b/gi) || []).length
}

/** Text content of the first <h1>, tags stripped. @param {string} html */
export function firstH1Text(html) {
  const match = documentWithoutScripts(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
  return match ? match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : ''
}

/**
 * Every JSON-LD node in the page, with @graph containers flattened.
 * Unparseable blocks are reported as `{ '@invalid': true }`.
 * @param {string} html
 * @returns {Record<string, any>[]}
 */
export function jsonLdNodes(html) {
  const blocks = [
    ...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ]
  /** @type {Record<string, any>[]} */
  const nodes = []
  for (const [, raw] of blocks) {
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      nodes.push({ '@invalid': true })
      continue
    }
    for (const item of Array.isArray(data) ? data : [data]) {
      if (item && Array.isArray(item['@graph'])) nodes.push(...item['@graph'])
      else if (item) nodes.push(item)
    }
  }
  return nodes
}

/** @param {Record<string, any>} node @param {string} type */
function hasType(node, type) {
  const value = node['@type']
  return Array.isArray(value) ? value.includes(type) : value === type
}

/**
 * Article nodes whose author list is non-empty and made only of Person
 * entities carrying a stable @id and a name.
 * @param {string} html
 */
export function articleAuthorsArePersons(html) {
  const articles = jsonLdNodes(html).filter(
    (node) => hasType(node, 'Article') || hasType(node, 'NewsArticle'),
  )
  if (!articles.length) return false
  return articles.every((article) => {
    const authors = Array.isArray(article.author) ? article.author : [article.author].filter(Boolean)
    return (
      authors.length > 0 &&
      authors.every(
        (/** @type {any} */ author) =>
          author && hasType(author, 'Person') && typeof author['@id'] === 'string' && author.name,
      )
    )
  })
}

/** hreflang values declared via <link rel="alternate">. @param {string} html */
export function hreflangs(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => tag)
    .filter((tag) => /rel=["']alternate["']/i.test(tag))
    .map((tag) => tag.match(/hrefLang=["']([^"']+)["']/i)?.[1])
    .filter((value) => value !== undefined && value !== null)
}

/** Whether the page declares an RSS feed in <head>. @param {string} html */
export function hasRssAlternate(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].some(
    ([tag]) => /rel=["']alternate["']/i.test(tag) && /type=["']application\/rss\+xml["']/i.test(tag),
  )
}

/**
 * Runs the SEO non-regression contract on one rendered page and returns the
 * failed checks (empty array = pass).
 * @param {string} html
 * @param {{ kind: 'home' | 'article', requiredHreflangs?: string[], forbiddenH1?: string[] }} options
 * @returns {string[]}
 */
export function seoPageFailures(html, { kind, requiredHreflangs = ['fr', 'en', 'x-default'], forbiddenH1 = [] }) {
  const failures = []
  const h1Count = countH1(html)
  if (h1Count !== 1) failures.push(`expected exactly one <h1>, found ${h1Count}`)
  const h1 = firstH1Text(html)
  if (forbiddenH1.some((text) => h1.toLowerCase() === text.toLowerCase())) {
    failures.push(`<h1> is a generic label ("${h1}")`)
  }
  const declared = hreflangs(html)
  for (const lang of requiredHreflangs) {
    if (!declared.includes(lang)) failures.push(`missing hreflang="${lang}"`)
  }
  if (!hasRssAlternate(html)) failures.push('missing RSS <link rel="alternate">')
  if (jsonLdNodes(html).some((node) => node['@invalid'])) failures.push('invalid JSON-LD block')
  if (kind === 'article' && !articleAuthorsArePersons(html)) {
    failures.push('Article JSON-LD author is not a Person with @id and name')
  }
  return failures
}

/** Generic labels that must never be the page H1. */
export const GENERIC_H1 = ['À la une', 'Top stories', 'Featured']
