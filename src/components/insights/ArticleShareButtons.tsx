'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { SiteLocale } from '@/i18n/config'
import { trackEditorialEvent } from '@/lib/analytics/client'

type Props = {
  locale: SiteLocale
  slug: string
  title: string
  url: string
  analyticsEnabled?: boolean
}

export function ArticleShareButtons({ locale, slug, title, url, analyticsEnabled = true }: Props) {
  const [copied, setCopied] = useState(false)
  const message = `${title} — ${url}`
  const links = [
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { name: 'WhatsApp', href: `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}` },
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
  ]

  function track(platform: string) {
    if (analyticsEnabled) trackEditorialEvent('share_click', { locale, slug, context: platform })
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      track('copy_link')
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="mt-5 border-t border-white/35 pt-4" aria-label={locale === 'fr' ? 'Partager cet article' : 'Share this article'}>
      <p className="mb-3 text-sm font-semibold text-white">{locale === 'fr' ? 'Partager' : 'Share'}</p>
      <div className="flex flex-wrap items-center gap-2">
        {links.map(({ name, href }) => (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer" onClick={() => track(name.toLowerCase())}
            aria-label={`${locale === 'fr' ? 'Partager sur' : 'Share on'} ${name}`}
            className="inline-flex min-h-10 items-center rounded-full border border-white/60 px-4 text-sm text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            {name}
          </a>
        ))}
        <button type="button" onClick={copy} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/60 px-4 text-sm text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
          {copied ? (locale === 'fr' ? 'Lien copié' : 'Link copied') : (locale === 'fr' ? 'Copier le lien' : 'Copy link')}
        </button>
      </div>
    </section>
  )
}
