import { createRequire } from 'node:module'

import { describe, expect, it, vi } from 'vitest'

import { aiReferralBootstrap, classifyAiReferrer } from '@/lib/analytics/aiReferrer'
import { detectAiCrawler } from '@/seo/aiCrawlers'

describe('classifyAiReferrer', () => {
  it.each([
    ['https://chatgpt.com/', '', 'chatgpt'],
    ['', '?utm_source=chatgpt.com', 'chatgpt'],
    ['https://www.perplexity.ai/search?q=x', '', 'perplexity'],
    ['https://gemini.google.com/app', '', 'gemini'],
    ['https://copilot.microsoft.com/', '', 'copilot'],
    ['https://claude.ai/chat/abc', '', 'claude'],
  ])('classifies %s %s as %s', (referrer, search, expected) => {
    expect(classifyAiReferrer(referrer, search)).toBe(expected)
  })

  it('ignores search engines, the site itself and look-alike hosts', () => {
    expect(classifyAiReferrer('https://www.google.com/', '')).toBeNull()
    expect(classifyAiReferrer('https://insight.trigenys.com/fr', '')).toBeNull()
    expect(classifyAiReferrer('https://notchatgpt.com/', '')).toBeNull()
    expect(classifyAiReferrer('not a url', '?utm_source=newsletter')).toBeNull()
  })
})

describe('aiReferralBootstrap', () => {
  function run(referrer: string, search: string) {
    const posthog = { register_for_session: vi.fn(), capture: vi.fn() }
    const location = { search, pathname: '/fr/posts/qr-cemac' }
    new Function('posthog', 'location', 'document', aiReferralBootstrap())(posthog, location, {
      referrer,
    })
    return posthog
  }

  it('registers the session property and a landing event, like the TS classifier', () => {
    const posthog = run('https://www.perplexity.ai/search', '')
    expect(posthog.register_for_session).toHaveBeenCalledWith({ ai_referrer: 'perplexity' })
    expect(posthog.capture).toHaveBeenCalledWith('ai_referral_landing', {
      ai_referrer: 'perplexity',
      landing_path: '/fr/posts/qr-cemac',
    })
    expect(run('', '?utm_source=chatgpt.com').register_for_session).toHaveBeenCalledWith({
      ai_referrer: 'chatgpt',
    })
  })

  it('does nothing for other traffic', () => {
    const posthog = run('https://www.google.com/', '')
    expect(posthog.register_for_session).not.toHaveBeenCalled()
    expect(posthog.capture).not.toHaveBeenCalled()
  })
})

describe('detectAiCrawler', () => {
  it('detects AI crawlers and ignores browsers', () => {
    expect(
      detectAiCrawler('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2)'),
    ).toBe('GPTBot')
    expect(detectAiCrawler('Mozilla/5.0 (compatible; PerplexityBot/1.0)')).toBe('PerplexityBot')
    expect(detectAiCrawler('Mozilla/5.0 (Macintosh) Safari/605.1.15')).toBeNull()
    expect(detectAiCrawler(null)).toBeNull()
  })

  it('covers every crawler named in robots.txt', () => {
    const require = createRequire(import.meta.url)
    const config = require('../../next-sitemap.config.cjs')
    const named = (config.robotsTxtOptions.policies as { userAgent: string }[])
      .map((policy) => policy.userAgent)
      .filter((agent) => agent !== '*')

    for (const agent of named)
      expect(detectAiCrawler(`Mozilla/5.0 (compatible; ${agent}/1.0)`)).toBe(agent)
  })
})
