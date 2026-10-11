import type { SiteLocale } from '@/i18n/config'
import type { ArticleHighlight } from './articleEditorial'
import { ArrowDownRight, Sparkles } from 'lucide-react'

export function ArticleHighlights({
  locale,
  highlights,
  takeaways = [],
}: {
  locale: SiteLocale
  highlights: ArticleHighlight[]
  /** Editor-written takeaways replace the automatic section highlights. */
  takeaways?: string[]
}) {
  if (takeaways.length === 0 && highlights.length < 2) return null

  const copy =
    locale === 'fr'
      ? {
          eyebrow: 'Lecture rapide',
          title: 'Ce qu’il faut retenir',
          description:
            takeaways.length > 0
              ? 'Les points clés de l’analyse, vérifiés par la rédaction.'
              : 'Trois repères pour entrer dans l’analyse sans perdre le fil.',
        }
      : {
          eyebrow: 'Quick read',
          title: 'What to take away',
          description:
            takeaways.length > 0
              ? 'The key points of this analysis, checked by the editors.'
              : 'Three anchors to enter the analysis without losing the thread.',
        }

  const heading = (
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
  )

  if (takeaways.length > 0) {
    return (
      <section
        aria-labelledby="article-highlights-title"
        className="article-highlights"
        data-key-takeaways
      >
        {heading}
        <ol className="article-takeaways">
          {takeaways.map((takeaway) => (
            <li key={takeaway}>{takeaway}</li>
          ))}
        </ol>
      </section>
    )
  }

  return (
    <section aria-labelledby="article-highlights-title" className="article-highlights">
      {heading}

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
