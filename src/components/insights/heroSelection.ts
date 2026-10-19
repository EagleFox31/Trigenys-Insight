import type { Post } from '@/payload-types'

// Existing CMS “featured” flag pins a recent story for at most seven days.
export function selectHeroPosts(posts: Post[], now = Date.now()): Post[] {
  const recent = posts
    .filter((post) => {
      const published = Date.parse(post.publishedAt || '')
      return (
        post._status === 'published' &&
        Boolean(post.title && post.slug) &&
        Number.isFinite(published) &&
        published <= now
      )
    })
    .sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!))
  const pinned = recent.find(
    (post) => post.featured && now - Date.parse(post.publishedAt!) < 7 * 86400000,
  )
  const ordered = pinned ? [pinned, ...recent.filter((post) => post.id !== pinned.id)] : recent
  return [...new Map(ordered.map((post) => [post.id, post])).values()].slice(0, 3)
}
