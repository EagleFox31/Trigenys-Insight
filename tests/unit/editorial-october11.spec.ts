import { describe, expect, it } from 'vitest'
import { october11EditorialArticles } from '@/editorial/october-11-2026'
import { createSourcedEditorialDocument } from '@/editorial/sourced-markdown-lexical'

type Node = { type?: string; fields?: { blockType?: string }; children?: Node[] }

describe('11 October editorial pack', () => {
  it('contains four distinct localized drafts, chart datasets and inline sources', () => {
    expect(october11EditorialArticles).toHaveLength(4)
    expect(new Set(october11EditorialArticles.map(a => a.slug)).size).toBe(4)

    for (const article of october11EditorialArticles) {
      expect(article.fr.title.length).toBeGreaterThan(15)
      expect(article.en.title.length).toBeGreaterThan(15)
      expect(article.fr.content).toContain('[[TRIGENYS_CHART]]')
      expect(article.en.content).toContain('[[TRIGENYS_CHART]]')
      expect(article.sources.length).toBeGreaterThan(1)
      expect(article.fr.content).toMatch(/\]\(https:\/\//)
      expect(article.en.content).toMatch(/\]\(https:\/\//)
      expect(article.chart?.fr.metrics[0].points.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('converts sourced markdown to clickable links and inline chart blocks', () => {
    const article = october11EditorialArticles[0]
    const doc = createSourcedEditorialDocument(article.fr.content, {
      marker: article.chart!.marker,
      data: article.chart!.fr,
    }) as { root: { children: Node[] } }

    expect(doc.root.children.some(n => n.type === 'block' && n.fields?.blockType === 'chart')).toBe(true)
    expect(doc.root.children.some(n => n.type === 'heading')).toBe(true)
    const hasLink = doc.root.children.some(n => n.children?.some(child =>
      child.type === 'link' && child.fields && 'url' in child.fields))
    expect(hasLink).toBe(true)
    expect(JSON.stringify(doc)).not.toContain('[[TRIGENYS_CHART]]')
    expect(JSON.stringify(doc)).not.toContain('[annoncé du')
  })
})
