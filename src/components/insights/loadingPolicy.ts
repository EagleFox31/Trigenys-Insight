/**
 * Presentation only, never gate or vary the underlying editorial data.
 *
 * Next.js also detects HTML-limited bots for metadata on its own. This small
 * list just suppresses the loading placeholder for common crawlers, while
 * retaining the site's original skeleton for normal browsing.
 */
const KNOWN_CRAWLER_USER_AGENTS =
  /Googlebot|Google-InspectionTool|Google-PageRenderer|bingbot|BingPreview|DuckDuckBot|Slurp|YandexBot|Baiduspider|OAI-SearchBot|GPTBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|PerplexityBot|facebookexternalhit|Twitterbot|LinkedInBot/i

export function isKnownEditorialCrawler(userAgent: string) {
  return KNOWN_CRAWLER_USER_AGENTS.test(userAgent)
}
