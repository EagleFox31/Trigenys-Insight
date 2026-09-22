import type { SiteLocale } from '@/i18n/config'
import type { ArticleHighlight } from './articleEditorial'
import { ArrowDownRight, Sparkles } from 'lucide-react'

export function ArticleHighlights({
  locale,
  highlights,
}: {
  locale: SiteLocale
  highlights: ArticleHighlight[]
}) {
  if (highlights.length < 2) return null

  const copy =
    locale === 'fr'
      ? {
          eyebrow: 'Lecture rapide',
          title: 'Ce qu’il faut retenir',
          description: 'Trois repères pour entrer dans l’analyse sans perdre le fil.',
        }
      : {
          eyebrow: 'Quick read',
          title: 'What to take away',
          description: 'Three anchors to enter the analysis without losing the thread.',
        }

  return (
    <section aria-labelledby="article-highlights-title" className="article-highlights">
      <div className="article-highlights__heading">
        <div className="article-highlights__eyebrow">
          <Sparkles aria-hidden="true" size={15} strokeWidth={1.8} />
          <span>{copy.eyebrow}</span>
        </div>
        <div>
          <h2 id="article-highlights-title">{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
      </div>

      <div className="article-highlights__grid">
        {highlights.slice(0, 3).map((highlight, index) => (
          <article className="article-highlight-card" key={highlight.title}>
            <div className="article-highlight-card__topline">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <ArrowDownRight aria-hidden="true" size={17} strokeWidth={1.6} />
            </div>
            <h3>{highlight.title}</h3>
            <p>{highlight.summary}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
