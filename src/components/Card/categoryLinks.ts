import type { SiteLocale } from '@/i18n/config'
import { withLocale } from '@/i18n/config'
import { localizedRubricPath, sectionForCategorySlug } from '@/editorial/rubrics'
import { categoryLabel } from '@/i18n/content'
import type { CardPostData } from './index'

// Canonical and legacy CMS categories can point to the same public section.
// Display each destination once without changing the stored relationships.
export function cardCategoryLinks(categories: CardPostData['categories'], locale: SiteLocale) {
  const seen = new Set<string>()
  return (categories || []).flatMap((category) => {
    if (!category || typeof category !== 'object') return []
    const rubric = sectionForCategorySlug(category.slug)
    const href = rubric
      ? localizedRubricPath(rubric, locale)
      : category.slug
        ? withLocale(locale, `/${category.slug}`)
        : null
    const label = categoryLabel(category as never, locale)
    const key = href || label
    if (seen.has(key)) return []
    seen.add(key)
    return [{ href, label, key }]
  })
}
