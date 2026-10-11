import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'
import { shouldShowNavigationSkeleton } from '@/components/insights/navigationSkeleton'

describe('P0: public crawl entry points', () => {
  it('does not expose the global frontend loading skeleton to article crawlers', async () => {
    const filename = path.join(process.cwd(), 'src/app/(frontend)/loading.tsx')
    await expect(access(filename)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('retains the editorial skeleton for real client-side navigation', async () => {
    const layout = await readFile(path.join(process.cwd(), 'src/app/(frontend)/layout.tsx'), 'utf8')
    const indicator = await readFile(
      path.join(process.cwd(), 'src/components/insights/NavigationSkeleton.tsx'),
      'utf8',
    )
    expect(layout).toContain('<NavigationSkeleton />')
    expect(indicator).toContain('<SiteSkeleton pathnameOverride={pending.to} />')
    expect(indicator).not.toContain('user-agent')
  })

  it('preserves scoped search feedback rather than removing all loading states', async () => {
    for (const locale of ['fr', 'en']) {
      const filename = path.join(process.cwd(), `src/app/(frontend)/${locale}/search/loading.tsx`)
      const code = await readFile(filename, 'utf8')
      expect(code).toContain('<SiteSkeleton />')
    }
  })

  it('provides a repeatable HTTP smoke check for live editorial markup', async () => {
    const script = await readFile(
      path.join(process.cwd(), 'scripts/seo/public-crawl-smoke.mjs'),
      'utf8',
    )
    expect(script).toContain('posts-sitemap.xml')
    expect(script).toContain('article-reading-main')
    expect(script).toContain('rel="canonical"')
  })
})

describe('navigation skeleton — human UX', () => {
  const current = new URL('https://insight.trigenys.com/fr')
  it('shows for an internal article navigation', () => {
    expect(shouldShowNavigationSkeleton(current, new URL('https://insight.trigenys.com/fr/posts/test'))).toBe(true)
  })
  it('never appears for external links, same-page hashes or same-path query changes', () => {
    expect(shouldShowNavigationSkeleton(current, new URL('https://example.com/fr/posts/test'))).toBe(false)
    expect(shouldShowNavigationSkeleton(current, new URL('https://insight.trigenys.com/fr#newsletter'))).toBe(false)
    expect(shouldShowNavigationSkeleton(current, new URL('https://insight.trigenys.com/fr?x=1'))).toBe(false)
  })
  it('does not cover admin or API navigation', () => {
    expect(shouldShowNavigationSkeleton(current, new URL('https://insight.trigenys.com/admin'))).toBe(false)
    expect(shouldShowNavigationSkeleton(current, new URL('https://insight.trigenys.com/api/posts'))).toBe(false)
  })
})
