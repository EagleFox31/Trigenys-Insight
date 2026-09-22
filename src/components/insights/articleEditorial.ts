type LexicalNode = {
  type?: string
  tag?: string
  text?: string
  children?: LexicalNode[]
}

export type ArticleHighlight = {
  title: string
  summary: string
}

function isNode(value: unknown): value is LexicalNode {
  return typeof value === 'object' && value !== null
}

function getNodeText(node: LexicalNode): string {
  if (typeof node.text === 'string') return node.text
  if (!Array.isArray(node.children)) return ''
  return node.children.map(getNodeText).join('').replace(/\s+/g, ' ').trim()
}

function truncate(value: string, maxLength = 180) {
  if (value.length <= maxLength) return value
  const shortened = value.slice(0, maxLength)
  const lastSpace = shortened.lastIndexOf(' ')
  return `${shortened.slice(0, lastSpace > 120 ? lastSpace : maxLength).trim()}…`
}

export function extractArticleHighlights(content: unknown, limit = 3): ArticleHighlight[] {
  if (!isNode(content)) return []

  const root = isNode((content as { root?: unknown }).root)
    ? ((content as { root: LexicalNode }).root)
    : content

  if (!Array.isArray(root.children)) return []

  const highlights: ArticleHighlight[] = []

  for (let index = 0; index < root.children.length && highlights.length < limit; index += 1) {
    const node = root.children[index]

    if (node.type !== 'heading' || node.tag !== 'h2') continue

    const title = getNodeText(node)
    if (!title) continue

    let summary = ''

    for (let cursor = index + 1; cursor < root.children.length; cursor += 1) {
      const next = root.children[cursor]

      if (next.type === 'heading') break

      const text = getNodeText(next)
      if (text.length >= 45) {
        summary = truncate(text)
        break
      }
    }

    if (summary) highlights.push({ title, summary })
  }

  return highlights
}
