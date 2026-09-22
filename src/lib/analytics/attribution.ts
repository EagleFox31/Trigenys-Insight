'use client'

import type { SiteLocale } from '@/i18n/config'
import type { ArticlePlacement } from './events'

const PENDING_KEY = 'trigenys:analytics:pending-article'
const ACTIVE_KEY = 'trigenys:analytics:active-article'
const PENDING_TTL_MS = 30 * 60 * 1000
const ACTIVE_TTL_MS = 6 * 60 * 60 * 1000

export type ArticleAttribution = {
  slug: string
  locale: SiteLocale
  placement: ArticlePlacement
  category?: string | null
  createdAt: number
}

function read(key: string): ArticleAttribution | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null

    const value = JSON.parse(raw) as Partial<ArticleAttribution>
    if (
      typeof value.slug !== 'string' ||
      (value.locale !== 'fr' && value.locale !== 'en') ||
      typeof value.placement !== 'string' ||
      typeof value.createdAt !== 'number'
    ) {
      window.sessionStorage.removeItem(key)
      return null
    }

    return value as ArticleAttribution
  } catch {
    return null
  }
}

function write(key: string, value: ArticleAttribution) {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Analytics attribution must never block navigation.
  }
}

function isFresh(value: ArticleAttribution, ttl: number) {
  return Date.now() - value.createdAt <= ttl
}

function matches(value: ArticleAttribution, slug: string, locale: SiteLocale) {
  return value.slug === slug && value.locale === locale
}

export function rememberArticleAttribution(input: {
  slug: string
  locale: SiteLocale
  placement: ArticlePlacement
  category?: string | null
}) {
  write(PENDING_KEY, {
    ...input,
    createdAt: Date.now(),
  })
}

export function activateArticleAttribution(slug: string, locale: SiteLocale) {
  if (typeof window === 'undefined') return null

  const pending = read(PENDING_KEY)

  window.sessionStorage.removeItem(PENDING_KEY)

  if (!pending || !isFresh(pending, PENDING_TTL_MS) || !matches(pending, slug, locale)) {
    window.sessionStorage.removeItem(ACTIVE_KEY)
    return null
  }

  const active: ArticleAttribution = {
    ...pending,
    createdAt: Date.now(),
  }

  write(ACTIVE_KEY, active)
  return active
}

export function getActiveArticleAttribution(slug: string, locale: SiteLocale) {
  if (typeof window === 'undefined') return null

  const active = read(ACTIVE_KEY)

  if (!active || !isFresh(active, ACTIVE_TTL_MS) || !matches(active, slug, locale)) {
    if (active) window.sessionStorage.removeItem(ACTIVE_KEY)
    return null
  }

  return active
}
