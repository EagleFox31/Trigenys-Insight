import { BrandMark } from '@/components/insights/BrandMark'
import { LanguageSwitcher } from '@/components/insights/LanguageSwitcher'
import { defaultLocale, isSiteLocale, withLocale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import { ArrowUpRight } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import React from 'react'

export async function Header() {
  const requestHeaders = await headers()
  const requestedLocale = requestHeaders.get('x-trigenys-locale')
  const locale = isSiteLocale(requestedLocale) ? requestedLocale : defaultLocale
  const t = getMessages(locale)

  const navItems = [
    { href: withLocale(locale, '/#technology'), label: t.header.tech },
    { href: withLocale(locale, '/#business'), label: t.header.business },
    { href: withLocale(locale, '/#systems'), label: t.header.systems },
    { href: withLocale(locale, '/#africa'), label: t.header.africa },
    { href: withLocale(locale, '/#methodologie'), label: t.header.methodology },
  ]

  return (
    <header className="site-header">
      <div className="insights-shell site-header__inner">
        <BrandMark href={withLocale(locale)} />
        <nav aria-label={t.header.navLabel} className="site-header__nav">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          <LanguageSwitcher locale={locale} />
          <Link className="header-cta" href={withLocale(locale, '/#newsletter')}>
            {t.header.brief} <ArrowUpRight aria-hidden="true" size={14} />
          </Link>
        </div>
      </div>
    </header>
  )
}
