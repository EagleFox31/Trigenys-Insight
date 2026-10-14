'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { MouseEvent } from 'react'

import type { SiteLocale } from '@/i18n/config'
import { withLocale } from '@/i18n/config'
import { usePreviousArticlePage } from './ArticleNavigationHistory'
import { safeArticleReturnPath } from './articleReturnPath'

export function ArticleBackLink({ locale }: { locale: SiteLocale }) {
  const router = useRouter()
  const previous = usePreviousArticlePage()
  const fallback = withLocale(locale, '/')

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return

    const current = window.location.href
    const inAppPrevious = safeArticleReturnPath(previous, current, locale)
    const fromReferrer = safeArticleReturnPath(document.referrer, current, locale)

    event.preventDefault()
    if (inAppPrevious) {
      // Next.js links create a browser history entry; this restores scroll
      // position as well as the exact page that opened the article.
      router.back()
    } else if (fromReferrer) {
      // A full-page navigation or new tab does not have App Router context.
      router.push(fromReferrer)
    } else {
      // Direct visits from social, Google or a copied URL stay on our site.
      router.push(fallback)
    }
  }

  return (
    <Link className="post-hero__back" href={fallback} onClick={handleClick}>
      <ArrowLeft aria-hidden="true" size={15} strokeWidth={1.8} />
      {locale === 'fr' ? 'Retour' : 'Back'}
    </Link>
  )
}
