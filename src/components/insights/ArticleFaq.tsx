import type { SiteLocale } from '@/i18n/config'
import type { FaqItem } from '@/seo/answerContent'

export function ArticleFaq({ locale, items }: { locale: SiteLocale; items: FaqItem[] }) {
  if (items.length === 0) return null

  return (
    <section aria-labelledby="article-faq-title" className="article-sources article-faq">
      <h2 id="article-faq-title">
        {locale === 'fr' ? 'Questions fréquentes' : 'Frequently asked questions'}
      </h2>
      <dl>
        {items.map((item) => (
          <div key={item.question}>
            <dt>{item.question}</dt>
            <dd>{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
