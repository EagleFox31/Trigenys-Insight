'use client'

import { BrandMark } from '@/components/insights/BrandMark'
import { localeFromPathname, withLocale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { socialProfiles } from './socialProfiles'

export function Footer() {
  const pathname = usePathname() || '/fr'
  const locale = localeFromPathname(pathname)
  const t = getMessages(locale)

  return (
    <footer className="site-footer">
      <div className={`insights-shell site-footer__grid${socialProfiles.length ? ' site-footer__grid--social' : ''}`}>
        <div>
          <BrandMark href={withLocale(locale)} inverse />
          <p>{t.footer.tagline}</p>
        </div>
        <div>
          <p className="site-footer__label">{t.footer.explore}</p>
          <Link href={withLocale(locale, '/posts')}>{t.footer.analyses}</Link>
          <Link href={withLocale(locale, '/methodology')}>{t.footer.methodology}</Link>
          <Link href={withLocale(locale, '/#newsletter')}>{t.footer.newsletter}</Link>
          <Link href={withLocale(locale, '/about')}>{t.footer.about}</Link>
        </div>
        <div>
          <p className="site-footer__label">Trigenys</p>
          <Link href={withLocale(locale, '/editorial-policy')}>{t.footer.editorialPolicy}</Link>
          <Link href={withLocale(locale, '/contact')}>{t.footer.contact}</Link>
          <a href="https://github.com/EagleFox31/Trigenys-Insight" rel="noreferrer" target="_blank">
            GitHub
          </a>
          <Link href="/admin">{t.footer.newsroom}</Link>
        </div>
        {socialProfiles.length > 0 && (
          <div>
            <p className="site-footer__label">{locale === 'fr' ? 'Nous suivre' : 'Follow us'}</p>
            {socialProfiles.map(({ name, url }) => (
              <a key={name} href={url} rel="noopener noreferrer me" target="_blank" aria-label={`${locale === 'fr' ? 'Suivre Trigenys Insight sur' : 'Follow Trigenys Insight on'} ${name}`}>
                {name} ↗
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="insights-shell site-footer__bottom">
        <span>© {new Date().getFullYear()} Trigenys Insights</span>
        <span>{t.footer.place}</span>
      </div>
    </footer>
  )
}
