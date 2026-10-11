import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { redirects } from '../../redirects'

describe('SEO discovery hardening', () => {
  it('redirects the legacy Vercel host to the canonical domain', async () => {
    expect(redirects).toBeTypeOf('function')
    const rules = await redirects!()
    const legacyRule = rules.find((rule) =>
      rule.has?.some(
        (condition) =>
          condition.type === 'host' && condition.value === 'trigenys-insight.vercel.app',
      ),
    )

    expect(legacyRule).toMatchObject({
      source: '/:path*',
      destination: 'https://insight.trigenys.com/:path*',
      permanent: true,
    })
  })

  it('names AI answer-engine crawlers explicitly in robots.txt', async () => {
    const { createRequire } = await import('node:module')
    const require = createRequire(import.meta.url)
    const config = require('../../next-sitemap.config.cjs')
    const policies = config.robotsTxtOptions.policies as Array<{
      userAgent: string
      allow?: string
      disallow?: string
    }>

    for (const agent of ['OAI-SearchBot', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
      expect(policies).toContainEqual({ userAgent: agent, allow: '/', disallow: '/admin/*' })
    }
    expect(config.robotsTxtOptions.additionalSitemaps).toContain(
      'https://insight.trigenys.com/news-sitemap.xml',
    )
  })

  it('keeps large-image Googlebot previews on published article metadata', async () => {
    const articlePage = await readFile(
      path.join(process.cwd(), 'src', 'components', 'insights', 'LocalizedPostPage.tsx'),
      'utf8',
    )

    expect(articlePage).toContain("'max-image-preview': 'large'")
    expect(articlePage).toContain("'max-snippet': -1")
    expect(articlePage).toContain("'max-video-preview': -1")
    expect(articlePage).not.toContain(
      "robots: draft ? { index: false, follow: false } : undefined",
    )
  })
})
