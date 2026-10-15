export type JSONRecord = Record<string, unknown>
export function asRecord(value: unknown): JSONRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JSONRecord) : {}
}
export function relationId(value: unknown): number | null {
  const raw = typeof value === 'object' && value ? asRecord(value).id : value
  const id = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw
  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : null
}
export function relationIds(value: unknown): number[] {
  return [
    ...new Set(
      (Array.isArray(value) ? value : []).map(relationId).filter((id): id is number => id !== null),
    ),
  ]
}
export function lexicalNodes(content: unknown): JSONRecord[] {
  const root = asRecord(asRecord(content).root)
  const pending: unknown[] = [root]
  const nodes: JSONRecord[] = []
  while (pending.length && nodes.length < 20000) {
    const node = asRecord(pending.pop())
    if (!Object.keys(node).length) continue
    nodes.push(node)
    if (Array.isArray(node.children)) pending.push(...[...node.children].reverse())
  }
  return nodes
}
export function inspectContent(content: unknown) {
  const nodes = lexicalNodes(content)
  const text = nodes
    .filter((node) => node.type === 'text')
    .map((node) => String(node.text ?? ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const blocks = nodes.filter((node) => node.type === 'block')
  return {
    nodes,
    text,
    blocks,
    hasContent: Boolean(text || blocks.length),
    wordCount: text ? text.split(/\s+/).length : 0,
  }
}
