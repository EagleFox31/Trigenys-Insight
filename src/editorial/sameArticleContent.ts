/** Payload can regenerate a Lexical block's database ID during a partial save. */
export function sameArticleContent(before: unknown, after: unknown): boolean {
  function normalize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(normalize)
    if (!value || typeof value !== 'object') return value
    const object = value as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(object).sort().map((key) => {
        if (object.type === 'block' && key === 'fields' && object.fields && typeof object.fields === 'object') {
          const { id: _id, ...fields } = object.fields as Record<string, unknown>
          return [key, normalize(fields)]
        }
        return [key, normalize(object[key])]
      }),
    )
  }
  return JSON.stringify(normalize(before)) === JSON.stringify(normalize(after))
}
