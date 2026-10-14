/** Payload can regenerate block and nested row database IDs during a partial save. */
export function sameArticleContent(before: unknown, after: unknown): boolean {
  function normalize(value: unknown, blockFields = false): unknown {
    if (Array.isArray(value)) return value.map((item) => normalize(item, blockFields))
    if (!value || typeof value !== 'object') return value
    const object = value as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(object).filter((key) => !(blockFields && key === 'id')).sort().map((key) => {
        if (object.type === 'block' && key === 'fields' && object.fields && typeof object.fields === 'object') {
          return [key, normalize(object.fields, true)]
        }
        return [key, normalize(object[key], blockFields)]
      }),
    )
  }
  return JSON.stringify(normalize(before)) === JSON.stringify(normalize(after))
}
