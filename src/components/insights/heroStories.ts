import type { Post } from '@/payload-types'
import type { SiteLocale } from '@/i18n/config'
import { withLocale } from '@/i18n/config'
import { formatPostDate, postKindLabel, primaryCategoryLabel } from '@/i18n/content'
import type { HeroStory } from './HeroCarousel'

// Shared presentation for the homepage and rubric highlights.
export function toHeroStory(post: Post, locale: SiteLocale): HeroStory {
  const hero = post.heroImage && typeof post.heroImage === 'object' ? post.heroImage : null
  const meta = post.meta?.image && typeof post.meta.image === 'object' ? post.meta.image : null
  const media = hero || meta
  const category = post.categories?.find((item) => item && typeof item === 'object')
  const excerpt = post.excerpt || post.meta?.description || ''
  return {
    id: post.id,
    slug: post.slug!,
    href: withLocale(locale, `/posts/${post.slug}`),
    title: post.title!,
    excerpt:
      excerpt.split(/\s+/).slice(0, 12).join(' ') + (excerpt.split(/\s+/).length > 12 ? '…' : ''),
    category: category && typeof category === 'object' ? category.slug || '' : '',
    categoryLabel: primaryCategoryLabel(post, locale),
    kindLabel: postKindLabel(post, locale),
    author:
      post.populatedAuthors
        ?.map((author) => author.name)
        .filter(Boolean)
        .join(', ') || 'Trigenys Insights',
    date: formatPostDate(post.publishedAt, locale, true),
    minutes: post.readingTime || 8,
    image: media?.url ? { url: media.url, alt: media.alt || '' } : null,
  }
}
