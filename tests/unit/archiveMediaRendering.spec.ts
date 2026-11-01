// @vitest-environment node
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { mediaURL } from '@/seo/structuredData'
import type { Post } from '@/payload-types'

const source = (file: string) => readFile(path.join(process.cwd(), file), 'utf8')

describe('published article cover integrity', () => {
  it('loads Hero relationships for both localized and legacy archive cards', async () => {
    for (const file of [
      'src/components/insights/LocalizedPostsArchivePage.tsx',
      'src/app/(frontend)/posts/page.tsx',
    ]) {
      const code = await source(file)
      expect(code).toMatch(/select:\s*\{[^}]*heroImage:\s*true/s)
      expect(code).toContain('depth: 1')
    }
  })

  it('renders an article Hero before optional SEO art, using a fallback only if needed', async () => {
    const code = await source('src/components/Card/index.tsx')
    const section = code.slice(code.indexOf('const cover ='), code.indexOf('const hasCategories'))
    expect(section.indexOf("heroImage && typeof heroImage === 'object'")).toBeGreaterThan(-1)
    expect(section.indexOf("metaImage && typeof metaImage === 'object'")).toBeGreaterThan(-1)
    expect(section.indexOf('heroImage &&')).toBeLessThan(section.indexOf('metaImage &&'))
  })

  it('uses an actual original file rather than an unverified legacy OG derivative', async () => {
    const metadataPage = await source('src/components/insights/LocalizedPostPage.tsx')
    expect(metadataPage).toContain('mediaURL(post.heroImage) ||')
    expect(metadataPage).not.toContain("mediaURL(post.meta?.image, 'og')")

    const validMedia = {
      url: 'https://cdn.example.test/media/verified-original.webp',
      sizes: { og: { url: 'https://cdn.example.test/media/missing-og.webp' } },
    } as unknown as NonNullable<Post['heroImage']>
    expect(mediaURL(validMedia)).toBe('https://cdn.example.test/media/verified-original.webp')
  })

  it('keeps Article structured data on original media URLs', async () => {
    const code = await source('src/seo/structuredData.ts')
    expect(code).toContain('const fallbackImage = mediaURL(post.meta?.image)')
  })
})
