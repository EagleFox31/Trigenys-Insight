import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('P0: public crawl entry points', () => {
  it('does not expose the global frontend loading skeleton to article crawlers', async () => {
    const filename = path.join(process.cwd(), 'src/app/(frontend)/loading.tsx')
    await expect(access(filename)).rejects.toMatchObject({ code: 'ENOENT' })
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
