import type { SiteLocale } from '@/i18n/config'

export const ANALYTICS_SCHEMA_VERSION = 1 as const

export type EditorialAnalyticsEvent =
  | 'article_card_impression'
  | 'article_card_click'
  | 'article_view'
  | 'article_read_25'
  | 'article_read_50'
  | 'article_read_75'
  | 'article_read_complete'
  | 'toc_click'
  | 'source_click'
  | 'share_click'
  | 'newsletter_cta_click'
  | 'newsletter_subscribe_success'

export type ArticlePlacement =
  | 'home_signal'
  | 'home_lead'
  | 'home_trending'
  | 'home_latest'
  | 'home_analysis'
  | 'home_editors_pick'
  | 'home_desk'
  | 'archive'
  | 'search'
  | 'related'

export type EditorialAnalyticsProperties = {
  slug?: string
  locale: SiteLocale
  placement?: ArticlePlacement | 'newsletter'
  category?: string | null
  context?: string
}

export function articleAnalyticsId(locale: SiteLocale, slug?: string) {
  return slug ? `${locale}:${slug}` : locale
}

export function analyticsContext(properties: EditorialAnalyticsProperties) {
  if (properties.context) return properties.context
  if (properties.placement && properties.category) {
    return `${properties.placement}:${properties.category}`
  }
  return properties.placement || properties.category || 'site'
}
