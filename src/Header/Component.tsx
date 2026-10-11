'use client'

import { BrandMark } from '@/components/insights/BrandMark'
import { LanguageSwitcher } from '@/components/insights/LanguageSwitcher'
import { localeFromPathname, withLocale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { editorialRubrics, localizedRubricPath } from '@/editorial/rubrics'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState } from 'react'

export function Header() {
  const pathname = usePathname() || '/fr'
  const locale = localeFromPathname(pathname)
  const t = getMessages(locale)

  const [openedFromPath, setOpenedFromPath] = useState<string | null>(null)
  const menuOpen = openedFromPath === pathname
  const navItems = editorialRubrics.map((rubric) => ({
    href: localizedRubricPath(rubric, locale),
    label: rubric.title[locale],
  }))


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
          <button
            aria-controls="editorial-mobile-nav"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? (locale === 'fr' ? 'Fermer le menu' : 'Close menu') : (locale === 'fr' ? 'Ouvrir le menu' : 'Open menu')}
            className="site-header__menu-toggle"
            onClick={() => setOpenedFromPath(menuOpen ? null : pathname)}
            type="button"
          >
            {menuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
          </button>
          <Link className="header-cta" href={withLocale(locale, '/#newsletter')}>
            {t.header.brief} <ArrowUpRight aria-hidden="true" size={14} />
          </Link>
        </div>
      </div>
      <nav aria-label={t.header.navLabel} className={`site-header__mobile-nav${menuOpen ? ' is-open' : ''}`} id="editorial-mobile-nav">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href} onClick={() => setOpenedFromPath(null)}>{item.label}</Link>
        ))}
        <Link href={withLocale(locale, '/methodology')} onClick={() => setOpenedFromPath(null)}>{t.header.methodology}</Link>
      </nav>
    </header>
  )
}
