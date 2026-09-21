export const siteLocales = ['fr', 'en'] as const

export type SiteLocale = (typeof siteLocales)[number]

export const defaultLocale: SiteLocale = 'fr'

export function isSiteLocale(value?: string | null): value is SiteLocale {
  return siteLocales.includes(value as SiteLocale)
}

export function withLocale(locale: SiteLocale, path = '') {
  if (!path || path === '/') return `/${locale}`
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`
}

export function localeFromPathname(pathname: string): SiteLocale {
  const first = pathname.split('/').filter(Boolean)[0]
  return isSiteLocale(first) ? first : defaultLocale
}

export function swapLocalePath(pathname: string, locale: SiteLocale) {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length > 0 && isSiteLocale(segments[0])) {
    segments[0] = locale
    return '/' + segments.join('/')
  }

  return withLocale(locale, pathname)
}
