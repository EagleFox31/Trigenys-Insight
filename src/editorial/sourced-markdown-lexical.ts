import type { Post } from '@/payload-types'
import type { EditorialChartInput } from './editorial-launch-pack'

// Dedicated parser for sourced articles: Markdown links must remain clickable
// inside Payload Lexical rather than being displayed as literal [label](url).
const textNode = (text: string, format = 0) => ({
  detail: 0, format, mode: 'normal', style: '', text, type: 'text', version: 1,
})

function inlineNodes(markdown: string): unknown[] {
  const nodes: unknown[] = []
  const tokens = /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let index = 0
  for (const match of markdown.matchAll(tokens)) {
    const start = match.index ?? 0
    if (start > index) nodes.push(textNode(markdown.slice(index, start)))
    if (match[1] && match[2]) {
      nodes.push({
        type: 'link', version: 2, format: '', indent: 0, direction: 'ltr',
        fields: { linkType: 'custom', newTab: true, url: match[2] },
        children: [textNode(match[1])],
      })
    } else if (match[3]) {
      nodes.push(textNode(match[3], 1))
    } else if (match[4]) {
      nodes.push(textNode(match[4], 2))
    }
    index = start + match[0].length
  }
  if (index < markdown.length) nodes.push(textNode(markdown.slice(index)))
  return nodes.length ? nodes : [textNode('')]
}

export function createSourcedEditorialDocument(
  source: string,
  chart?: { marker: string; data: EditorialChartInput },
): Post['content'] {
  const paragraphs = source.trim().split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
  const children = paragraphs.map(block => {
    if (chart && block === chart.marker) {
      return { type: 'block', version: 2, format: '',
        fields: { blockType: 'chart', ...chart.data } }
    }
    const heading = block.match(/^(#{2,4})\s+(.+)$/)
    if (heading) {
      return {
        type: 'heading', version: 1, tag: 'h' + heading[1].length,
        direction: 'ltr', format: '', indent: 0,
        children: inlineNodes(heading[2]),
      }
    }
    return {
      type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0,
      textFormat: 0, children: inlineNodes(block),
    }
  })
  return { root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children } } as unknown as Post['content']
}
