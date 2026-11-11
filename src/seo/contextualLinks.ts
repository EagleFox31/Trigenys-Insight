export const CONTEXTUAL_LINK_COUNT = 3

type Linkable = { id: number | string; slug?: string | null; categories?: unknown[] | null }

function categoryIds(post: Linkable) {
  return new Set(
    (post.categories || [])
      .map((category) =>
        typeof category === 'object' && category !== null ? (category as { id?: unknown }).id : category,
      )
      .filter((id) => id !== null && id !== undefined),
  )
}

/**
 * Internal links shown under an article: editor-picked related posts first,
 * then the most recent candidates sharing a category, then the most recent
 * candidates overall, up to `count`. Never the article itself, never twice.
 */
export function selectContextualLinks<T extends Linkable>(
  post: Linkable,
  editorPicks: readonly T[],
  candidates: readonly T[],
  count = CONTEXTUAL_LINK_COUNT,
): T[] {
  const selected: T[] = []
  const seen = new Set<number | string>([post.id])
  const add = (doc: T) => {
    if (selected.length >= count || seen.has(doc.id) || !doc.slug) return
    seen.add(doc.id)
    selected.push(doc)
  }

  editorPicks.forEach(add)

  const own = categoryIds(post)
  candidates
    .filter((doc) => [...categoryIds(doc)].some((id) => own.has(id)))
    .forEach(add)
  candidates.forEach(add)

  return selected
}
