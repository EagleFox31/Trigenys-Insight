import type { Post } from '@/payload-types'
import { createSourcedEditorialDocument } from '@/editorial/sourced-markdown-lexical'
import { validateMarkers, type ArticleInput } from '../../packages/insight-automation/src/schema'

export function createAutomationContent(input: ArticleInput): Post['content'] {
  const errors = validateMarkers(input)
  if (errors.length) throw new Error(errors.join('; '))
  const definitions = new Map<string, Record<string, unknown>>()
  for (const { marker, ...data } of input.charts ?? []) {
    definitions.set(marker, { blockType: 'chart', ...data })
  }
  for (const { marker, media } of input.images ?? []) {
    definitions.set(marker, { blockType: 'mediaBlock', media })
  }
  const doc = createSourcedEditorialDocument(input.body)
  doc.root.children = input.body
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block) => {
      const fields = definitions.get(block)
      if (fields) return [{ type: 'block', version: 2, format: '', fields }]
      return createSourcedEditorialDocument(block).root.children
    })
  return doc
}
