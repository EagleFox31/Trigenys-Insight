'use client'

import type { SiteLocale } from '@/i18n/config'
import { swapLocalePath } from '@/i18n/config'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function LanguageSwitcher({ locale }: { locale: SiteLocale }) {
  const pathname = usePathname() || '/'
  const isLocalizedRoute = /^\/(fr|en)(\/|$)/.test(pathname)

  if (!isLocalizedRoute) return null

  return (
    <div className="locale-switcher" aria-label="Language">
      {(['fr', 'en'] as const).map((target) => (
        <Link
          aria-current={locale === target ? 'page' : undefined}
          className={locale === target ? 'is-active' : undefined}
          href={swapLocalePath(pathname, target)}
          hrefLang={target}
          key={target}
        >
          {target.toUpperCase()}
        </Link>
      ))}
    </div>
  )
}
