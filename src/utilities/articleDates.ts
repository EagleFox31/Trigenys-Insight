/** Minimum gap before an edit is presented to readers as an update. */
export const VISIBLE_UPDATE_THRESHOLD_MS = 24 * 60 * 60 * 1000

type DatedPost = {
  publishedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

/**
 * Publication and modification dates shared by the visible byline and the
 * Article JSON-LD, so structured data never claims a date the page hides.
 * Minor same-day edits do not count as a visible update.
 */
export function articleDates(post: DatedPost) {
  const published = post.publishedAt || post.createdAt || null
  const updatedAt = post.updatedAt || null
  const showModified = Boolean(
    published &&
      updatedAt &&
      new Date(updatedAt).getTime() - new Date(published).getTime() >= VISIBLE_UPDATE_THRESHOLD_MS,
  )

  return {
    published,
    modified: showModified ? updatedAt : published,
    showModified,
  }
}
