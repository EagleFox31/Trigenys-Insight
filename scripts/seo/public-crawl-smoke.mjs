#!/usr/bin/env node

// Zero-dependency HTTP smoke test for search engine accessibility.
// Usage: node scripts/seo/public-crawl-smoke.mjs [https://insight.trigenys.com]
// Pass a preview deployment URL to test its routes while still enforcing the
// production canonical URLs emitted by the site.
const base = new URL(process.argv[2] || process.env.SEO_SMOKE_BASE_URL || 'https://insight.trigenys.com')
const canonicalHost = 'insight.trigenys.com'
const failures = []

function assert(condition, message) {
  if (!condition) {
    failures.push(message)
    console.error(`FAIL ${message}`)
  } else {
    console.log(`PASS ${message}`)
  }
}

async function request(path) {
  const url = new URL(path, base)
  const response = await fetch(url, {
    headers: { 'User-Agent': 'TrigenysSEO-P0-Smoke/1.0' },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  })
  const text = await response.text()
  assert(response.ok, `${url.pathname}: HTTP ${response.status}`)
  return { text, response, url }
}

function documentWithoutScripts(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
}

function sitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => match[1].replace(/&amp;/g, '&'))
}

async function main() {
  const { text: robots } = await request('/robots.txt')
  assert(robots.includes('Sitemap:') && robots.includes('insight.trigenys.com'), 'robots.txt lists canonical sitemaps')

  const { text: xml } = await request('/posts-sitemap.xml')
  assert(xml.includes('<urlset'), 'posts sitemap returns a URL set')
  const articleURLs = sitemapLocs(xml)
  assert(articleURLs.length > 0, 'posts sitemap contains at least one article')
  assert(
    articleURLs.every((url) => {
      try {
        return new URL(url).host === canonicalHost && new URL(url).protocol === 'https:'
      } catch {
        return false
      }
    }),
    'all article sitemap URLs point to the canonical HTTPS host',
  )

  const { text: newsXML } = await request('/news-sitemap.xml')
  assert(newsXML.includes('<urlset'), 'News sitemap returns a URL set')
  assert(
    sitemapLocs(newsXML).every((url) => new URL(url).host === canonicalHost),
    'News sitemap URLs point to the canonical host',
  )

  for (const locale of ['fr', 'en']) {
    const { text: homeHTML } = await request(`/${locale}`)
    const visibleHome = documentWithoutScripts(homeHTML)
    assert(/<h1\b/i.test(visibleHome), `${locale} homepage has a server-rendered H1`)
    assert(!/class="site-skeleton(?:\s|")/i.test(visibleHome), `${locale} homepage does not stream a global loading skeleton`)

    const article = articleURLs.find((url) => new URL(url).pathname.startsWith(`/${locale}/posts/`))
    if (!article) {
      console.log(`SKIP ${locale} article check: no localized article in sitemap`)
      continue
    }

    const { text: articleHTML } = await request(new URL(article).pathname)
    const visibleArticle = documentWithoutScripts(articleHTML)
    assert(/<article\b/i.test(visibleArticle), `${locale} article body is in the HTML response`)
    assert(/article-reading-main/.test(visibleArticle), `${locale} article reading content is in the HTML response`)
    assert(/<h1\b/i.test(visibleArticle), `${locale} article heading is in the HTML response`)
    assert(!/class="site-skeleton(?:\s|")/i.test(visibleArticle), `${locale} article does not stream a global loading skeleton`)
    assert(/rel="canonical"/.test(articleHTML) && articleHTML.includes(article), `${locale} article carries its canonical URL`)
  }
}

try {
  await main()
} catch (error) {
  failures.push(String(error))
  console.error('FAIL crawl smoke:', error)
}

console.log(`\nPublic crawl smoke: ${failures.length ? failures.length + ' failure(s)' : 'all checks passed'}`)
process.exitCode = failures.length ? 1 : 0
