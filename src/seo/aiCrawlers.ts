// User agents of AI answer-engine and training crawlers. Kept in sync with the
// named robots.txt policies in next-sitemap.config.cjs (checked by a unit test).
const AI_CRAWLER_TOKENS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'Claude-SearchBot',
  'Claude-User',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'CCBot',
  'Meta-ExternalAgent',
  'Bytespider',
  'DuckAssistBot',
  'MistralAI-User',
] as const

export function detectAiCrawler(userAgent?: string | null): string | null {
  if (!userAgent) return null
  const ua = userAgent.toLowerCase()
  return AI_CRAWLER_TOKENS.find((token) => ua.includes(token.toLowerCase())) ?? null
}

/**
 * One structured log line per AI crawler hit, searchable in the hosting logs
 * (e.g. Vercel: filter on "ai_crawler_hit").
 */
export function logAiCrawlerHit(userAgent: string | null | undefined, path: string) {
  const crawler = detectAiCrawler(userAgent)
  if (!crawler) return
  console.info(JSON.stringify({ event: 'ai_crawler_hit', crawler, path }))
}
