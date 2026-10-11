import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  editorialRubrics,
  getEditorialRubric,
  localizedRubricPath,
  rubricMatchesCategory,
  sectionForCategorySlug,
} from '@/editorial/rubrics'
import { swapLocalePath } from '@/i18n/config'
import { redirects } from '../../redirects'

describe('Trigenys Insights: six bilingual editorial rubrics', () => {
  it('has exactly six canonical sections and unique locale-specific slugs', () => {
    expect(editorialRubrics).toHaveLength(6)
    for (const locale of ['fr', 'en'] as const) {
      const paths = editorialRubrics.map((rubric) => localizedRubricPath(rubric, locale))
      expect(new Set(paths).size).toBe(6)
      expect(paths.every((route) => route.startsWith(`/${locale}/`))).toBe(true)
      expect(editorialRubrics.every((rubric) => rubric.title[locale] && rubric.description[locale])).toBe(true)
    }
  })

  it('preserves legacy article category relationships', () => {
    expect(rubricMatchesCategory('tech-ai', 'technology')).toBe(true)
    expect(rubricMatchesCategory('tech-ai', 'information-systems')).toBe(true)
    expect(rubricMatchesCategory('business-finance', 'business')).toBe(true)
    expect(rubricMatchesCategory('society-future', 'africa')).toBe(true)
    expect(rubricMatchesCategory('made-in-africa', 'consommer-camerounais')).toBe(true)
    expect(rubricMatchesCategory('made-in-africa', 'consommer-africain')).toBe(true)
    expect(sectionForCategorySlug('gaming-culture')?.id).toBe('gaming-culture')
    expect(rubricMatchesCategory('gaming-culture', 'business')).toBe(false)
  })

  it('switches localized category paths without producing broken URLs', () => {
    expect(swapLocalePath('/fr/etudes-carrieres', 'en')).toBe('/en/education-careers')
    expect(swapLocalePath('/en/society-future', 'fr')).toBe('/fr/societe-avenir')
    expect(swapLocalePath('/fr/made-in-africa', 'en')).toBe('/en/built-in-africa')
    expect(swapLocalePath('/fr/posts/mon-article', 'en')).toBe('/en/posts/mon-article')
  })

  it('maintains a permanent redirect for each legacy desk in both locales', async () => {
    const all = await redirects!()
    for (const locale of ['fr', 'en'] as const) {
      for (const [legacy, id] of [
        ['technology', 'tech-ai'],
        ['business', 'business-finance'],
        ['information-systems', 'tech-ai'],
        ['africa', 'society-future'],
        ['consommer-local', 'made-in-africa'],
      ] as const) {
        expect(all).toContainEqual({
          source: `/${locale}/${legacy}`,
          destination: localizedRubricPath(getEditorialRubric(id), locale),
          permanent: true,
        })
      }
    }
  })

  it('creates all 12 canonical route files, with the CMS setup secured behind POST', async () => {
    for (const section of editorialRubrics) {
      for (const locale of ['fr', 'en'] as const) {
        const page = path.join(
          process.cwd(), 'src/app/(frontend)', locale, section.paths[locale], 'page.tsx',
        )
        const content = await readFile(page, 'utf8')
        expect(content).toContain(`desk="${section.id}"`)
      }
    }
    const admin = await readFile(
      path.join(process.cwd(), 'src/app/(frontend)/api/editorial/setup-rubriques/route.ts'),
      'utf8',
    )
    expect(admin).toContain("if (!user)")
    expect(admin).toContain('export async function POST()')
    expect(admin).not.toContain('export async function GET()')
  })

  it('keeps sitemap paths canonical rather than advertising legacy redirects', async () => {
    const source = await readFile(
      path.join(process.cwd(), 'src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts'),
      'utf8',
    )
    expect(source).toContain('localizedRubricPath(rubric, locale)')
    expect(source).not.toContain("'/technology',")
    expect(source).not.toContain("'/information-systems',")
  })
})
