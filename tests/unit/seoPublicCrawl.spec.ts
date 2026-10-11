import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'
import { isKnownEditorialCrawler } from '@/components/insights/loadingPolicy'

describe('P0: public crawl entry points', () => {
  it('preserves the original loading skeleton for human readers', async () => {
    const filename = path.join(process.cwd(), 'src/app/(frontend)/loading.tsx')
    const source = await readFile(filename, 'utf8')

    expect(source).toContain('return <SiteSkeleton />')
    expect(source).toContain('isKnownEditorialCrawler(userAgent)')
  })

  it('never varies editorial page content or auth based on crawler agent', async () => {
    const policy = await readFile(
      path.join(process.cwd(), 'src/components/insights/loadingPolicy.ts'),
      'utf8',
    )
    expect(policy).not.toContain('notFound(')
    expect(policy).not.toContain('redirect(')
    expect(policy).not.toContain('payload.find(')
  })

  it('provides repeatable live crawler markup checks', async () => {
    const script = await readFile(
      path.join(process.cwd(), 'scripts/seo/public-crawl-smoke.mjs'),
      'utf8',
    )
    expect(script).toContain('posts-sitemap.xml')
    expect(script).toContain('article-reading-main')
    expect(script).toContain('rel="canonical"')
  })
})

describe('human versus crawler — loading UI only', () => {
  it('does not suppress skeleton for real readers', () => {
    expect(isKnownEditorialCrawler('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/154.0.0.0')).toBe(false)
    expect(isKnownEditorialCrawler('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile')).toBe(false)
    expect(isKnownEditorialCrawler('')).toBe(false)
  })

  it.each(['Googlebot/2.1', 'bingbot/2.0', 'OAI-SearchBot/1.0', 'ClaudeBot/1.0', 'PerplexityBot/1.0'])(
    'skips placeholder for known HTML crawler %s',
    (userAgent) => expect(isKnownEditorialCrawler(userAgent)).toBe(true),
  )
})
