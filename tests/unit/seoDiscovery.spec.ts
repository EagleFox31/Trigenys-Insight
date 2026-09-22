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

  it('keeps llms.txt concise and canonical', async () => {
    const llms = await readFile(path.join(process.cwd(), 'public', 'llms.txt'), 'utf8')

    expect(llms).toContain('Canonical site: https://insight.trigenys.com')
    expect(llms).toContain('https://insight.trigenys.com/fr/posts')
    expect(llms).toContain('https://insight.trigenys.com/en/posts')
    expect(llms).toContain('https://insight.trigenys.com/pages-sitemap.xml')
    expect(llms).toContain('https://insight.trigenys.com/posts-sitemap.xml')
    expect(llms).not.toContain('vercel.app')
    expect(llms).not.toContain('/admin')
  })
})
