import { describe, expect, it } from 'vitest'
import { geminiArgonArticle } from '../../src/editorial/gemini-4-argon-rounds-2026'
import { createSourcedEditorialDocument } from '../../src/editorial/sourced-markdown-lexical'

describe('Gemini Argon editorial pack', () => {
  it.each(['fr', 'en'] as const)('embeds exactly four sourced Payload charts in %s', locale => {
    const article = geminiArgonArticle[locale]
    const graphs = geminiArgonArticle.charts
    expect(graphs).toHaveLength(4)

    for (const graph of graphs) {
      expect(article.content.split(graph.marker)).toHaveLength(2)
      const data = graph[locale]
      expect(data.sourceUrl).toMatch(/^https:\/\//)
      expect(data.metrics.length).toBeGreaterThan(0)
      for (const metric of data.metrics) {
        expect(metric.points.length).toBeGreaterThanOrEqual(2)
        expect(metric.points.every(point => Number.isFinite(point.value))).toBe(true)
      }
    }

    const doc = createSourcedEditorialDocument(
      article.content,
      graphs.map(graph => ({ marker: graph.marker, data: graph[locale] })),
    )
    const children = (doc as unknown as { root: { children: Array<{ type: string; fields?: { blockType?: string; sourceUrl?: string } }> } }).root.children
    const blocks = children.filter(node => node.type === 'block')
    expect(blocks).toHaveLength(4)
    expect(blocks.every(node => node.fields?.blockType === 'chart')).toBe(true)
    expect(blocks.every(node => node.fields?.sourceUrl?.startsWith('https://'))).toBe(true)
    expect(children.some(node => node.type === 'heading')).toBe(true)
    expect(children.some(node => node.type === 'paragraph')).toBe(true)
  })
})
