import type { Category, Post } from '@/payload-types'
import type { SiteLocale } from './config'

const categoryLabels: Record<SiteLocale, Record<string, string>> = {
  fr: {
    technology: 'Technologie',
    business: 'Business',
    'information-systems': "Systèmes d'information",
    africa: 'Afrique',
  },
  en: {
    technology: 'Technology',
    business: 'Business',
    'information-systems': 'Information Systems',
    africa: 'Africa',
  },
}

const kindLabels: Record<SiteLocale, Record<string, string>> = {
  fr: {
    analysis: 'Analyse de fond',
    guide: 'Guide pratique',
    comparison: 'Comparatif',
    'field-note': 'Note de terrain',
  },
  en: {
    analysis: 'Deep analysis',
    guide: 'Practical guide',
    comparison: 'Comparison',
    'field-note': 'Field note',
  },
}

export function categoryLabel(category: number | Category | null | undefined, locale: SiteLocale) {
  if (!category || typeof category !== 'object') return locale === 'fr' ? 'Analyse' : 'Analysis'
  return categoryLabels[locale][category.slug] || category.title || (locale === 'fr' ? 'Analyse' : 'Analysis')
}

export function primaryCategoryLabel(post: Post, locale: SiteLocale) {
  const category = post.categories?.find((item) => item && typeof item === 'object')
  return categoryLabel(category, locale)
}

export function postKindLabel(post: Post, locale: SiteLocale) {
  if (!post.kind) return locale === 'fr' ? 'Analyse' : 'Analysis'
  return kindLabels[locale][post.kind] || post.kind
}

export function formatPostDate(value: null | string | undefined, locale: SiteLocale, long = false) {
  if (!value) return locale === 'fr' ? 'Bientôt' : 'Coming soon'
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: long ? 'long' : 'short',
    year: 'numeric',
  }).format(new Date(value))
}
