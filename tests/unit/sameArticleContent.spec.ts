import { describe, expect, it } from 'vitest'
import { sameArticleContent } from '../../src/editorial/sameArticleContent'

describe('article content comparison after a Payload save', () => {
  const content = (id: string, number = 42) => ({ root: { children: [
    { type: 'paragraph', children: [{ type: 'text', text: 'Example' }] },
    { type: 'block', fields: { id, blockType: 'chart', metrics: [{ id, points: [{ id, value: number }] }] } },
  ] } })
  it('ignores regenerated block and row IDs, while detecting content changes', () => {
    expect(sameArticleContent(content('old'), content('new'))).toBe(true)
    expect(sameArticleContent(content('old'), content('new', 43))).toBe(false)
    expect(sameArticleContent({ id: 'old' }, { id: 'new' })).toBe(false)
    expect(sameArticleContent(content('old'), { root: { children: [] } })).toBe(false)
  })
})
