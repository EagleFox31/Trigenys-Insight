import type { SiteLocale } from '@/i18n/config'

/**
 * Allow only normal public, same-origin, localized pages as a return target.
 * We never send someone back to an external referrer, admin, an API route,
 * or the currently open article.
 */
export function safeArticleReturnPath(
  candidate: string | null | undefined,
  currentUrl: string,
  locale: SiteLocale,
): string | null {
  if (!candidate) return null

  try {
    const current = new URL(currentUrl)
    const target = new URL(candidate, current.origin)
    if (target.origin !== current.origin) return null

    // Restrict to published site pages in the article's language.
    const localePrefix = `/${locale}`
    if (target.pathname !== localePrefix && !target.pathname.startsWith(`${localePrefix}/`)) {
      return null
    }
    const targetPath = target.pathname + target.search + target.hash
    const currentPath = current.pathname + current.search + current.hash
    if (targetPath === currentPath) return null

    return targetPath
  } catch {
    return null
  }
}
