import { BrandMark } from '@/components/insights/BrandMark'
import { defaultLocale, isSiteLocale, withLocale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import { headers } from 'next/headers'
import Link from 'next/link'
import React from 'react'

export async function Footer() {
  const requestHeaders = await headers()
  const requestedLocale = requestHeaders.get('x-trigenys-locale')
  const locale = isSiteLocale(requestedLocale) ? requestedLocale : defaultLocale
  const t = getMessages(locale)

  return (
    <footer className="site-footer">
      <div className="insights-shell site-footer__grid">
        <div>
          <BrandMark href={withLocale(locale)} inverse />
          <p>{t.footer.tagline}</p>
        </div>
        <div>
          <p className="site-footer__label">{t.footer.explore}</p>
          <Link href={withLocale(locale, '/posts')}>{t.footer.analyses}</Link>
          <Link href={withLocale(locale, '/#methodologie')}>{t.footer.methodology}</Link>
          <Link href={withLocale(locale, '/#newsletter')}>{t.footer.newsletter}</Link>
        </div>
        <div>
          <p className="site-footer__label">Trigenys</p>
          <a href="https://github.com/EagleFox31/Trigenys-Insight" rel="noreferrer" target="_blank">
            GitHub
          </a>
          <Link href="/admin">{t.footer.newsroom}</Link>
        </div>
      </div>
      <div className="insights-shell site-footer__bottom">
        <span>© {new Date().getFullYear()} Trigenys Insights</span>
        <span>{t.footer.place}</span>
      </div>
    </footer>
  )
}
