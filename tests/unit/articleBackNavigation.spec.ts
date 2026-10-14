import { describe, expect, it } from 'vitest'
import { safeArticleReturnPath } from '@/components/insights/articleReturnPath'

const article = 'https://insight.trigenys.com/fr/posts/exemple'

describe('Article return navigation', () => {
  it('accepts the same-language homepage and keeps the origin query/hash', () => {
    expect(safeArticleReturnPath('/fr', article, 'fr')).toBe('/fr')
    expect(safeArticleReturnPath('/fr/tech-ia', article, 'fr')).toBe('/fr/tech-ia')
    expect(safeArticleReturnPath('/fr/search?q=ia#resultats', article, 'fr'))
      .toBe('/fr/search?q=ia#resultats')
  })

  it('rejects external, other-language and self-referencing destinations', () => {
    expect(safeArticleReturnPath('https://www.google.com/search?q=ia', article, 'fr')).toBeNull()
    expect(safeArticleReturnPath('//evil.example/fr', article, 'fr')).toBeNull()
    expect(safeArticleReturnPath('https://insight.trigenys.com/en', article, 'fr')).toBeNull()
    expect(safeArticleReturnPath('/fr/posts/exemple', article, 'fr')).toBeNull()
    expect(safeArticleReturnPath('not a valid url', article, 'fr')).toBeNull()
    expect(safeArticleReturnPath(undefined, article, 'fr')).toBeNull()
  })

  it('supports the EN site without redirecting to the FR homepage', () => {
    expect(safeArticleReturnPath('/en/business-finance',
      'https://insight.trigenys.com/en/posts/another', 'en')).toBe('/en/business-finance')
  })
})
