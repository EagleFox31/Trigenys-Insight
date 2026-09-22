'use client'

import { usePathname } from 'next/navigation'

function Bone({
  className = '',
}: {
  className?: string
}) {
  return <span aria-hidden="true" className={`skeleton-bone ${className}`} />
}

function StoryCardSkeleton() {
  return (
    <article className="skeleton-story-card" aria-hidden="true">
      <Bone className="skeleton-story-card__media" />
      <Bone className="skeleton-line skeleton-line--xs" />
      <Bone className="skeleton-line skeleton-line--title" />
      <Bone className="skeleton-line skeleton-line--wide" />
      <Bone className="skeleton-line skeleton-line--medium" />
    </article>
  )
}

function HomeSkeleton() {
  return (
    <main className="skeleton-page skeleton-home">
      <section className="skeleton-home__lead">
        <div className="insights-shell skeleton-home__lead-grid">
          <div>
            <Bone className="skeleton-line skeleton-line--eyebrow" />
            <Bone className="skeleton-line skeleton-line--hero" />
            <Bone className="skeleton-line skeleton-line--hero skeleton-line--hero-short" />
            <div className="skeleton-home__deck">
              <Bone className="skeleton-line skeleton-line--wide" />
              <Bone className="skeleton-line skeleton-line--medium" />
            </div>
          </div>
          <Bone className="skeleton-home__lead-media" />
        </div>
      </section>

      <section className="insights-shell skeleton-home__ticker">
        <Bone className="skeleton-line skeleton-line--xs" />
        <Bone className="skeleton-line skeleton-line--wide" />
      </section>

      <section className="insights-shell skeleton-home__stories">
        <div className="skeleton-section-heading">
          <div>
            <Bone className="skeleton-line skeleton-line--eyebrow" />
            <Bone className="skeleton-line skeleton-line--section-title" />
          </div>
          <Bone className="skeleton-pill" />
        </div>
        <div className="skeleton-story-grid">
          <StoryCardSkeleton />
          <StoryCardSkeleton />
          <StoryCardSkeleton />
        </div>
      </section>
    </main>
  )
}

function ArchiveSkeleton({ search = false }: { search?: boolean }) {
  return (
    <main className="skeleton-page skeleton-archive">
      <section className="container skeleton-archive__heading">
        <Bone className="skeleton-line skeleton-line--eyebrow" />
        <Bone className="skeleton-line skeleton-line--archive-title" />
        <Bone className="skeleton-line skeleton-line--wide" />
        {search ? <Bone className="skeleton-search-field" /> : null}
      </section>

      <section className="container skeleton-archive__meta">
        <Bone className="skeleton-line skeleton-line--small" />
      </section>

      <section className="container skeleton-story-grid skeleton-story-grid--archive">
        {Array.from({ length: 6 }).map((_, index) => (
          <StoryCardSkeleton key={index} />
        ))}
      </section>
    </main>
  )
}

function ArticleSkeleton() {
  return (
    <main className="skeleton-page skeleton-article">
      <section className="skeleton-article__hero">
        <div className="insights-shell">
          <Bone className="skeleton-line skeleton-line--small" />
          <Bone className="skeleton-line skeleton-line--eyebrow" />
          <Bone className="skeleton-line skeleton-line--article-title" />
          <Bone className="skeleton-line skeleton-line--article-title skeleton-line--article-title-short" />
          <div className="skeleton-article__excerpt">
            <Bone className="skeleton-line skeleton-line--wide" />
            <Bone className="skeleton-line skeleton-line--medium" />
          </div>
          <div className="skeleton-article__meta">
            <Bone className="skeleton-line skeleton-line--small" />
            <Bone className="skeleton-line skeleton-line--small" />
            <Bone className="skeleton-line skeleton-line--small" />
          </div>
          <Bone className="skeleton-article__hero-media" />
        </div>
      </section>

      <section className="article-reading-shell">
        <div className="insights-shell skeleton-article__reading-grid">
          <div className="skeleton-article__main">
            <div className="skeleton-highlight-row">
              <Bone className="skeleton-highlight-card" />
              <Bone className="skeleton-highlight-card" />
              <Bone className="skeleton-highlight-card" />
            </div>

            <div className="skeleton-copy-block">
              <Bone className="skeleton-line skeleton-line--section-title" />
              <Bone className="skeleton-line skeleton-line--wide" />
              <Bone className="skeleton-line skeleton-line--wide" />
              <Bone className="skeleton-line skeleton-line--medium" />
            </div>

            <div className="skeleton-copy-block">
              <Bone className="skeleton-line skeleton-line--section-title" />
              <Bone className="skeleton-line skeleton-line--wide" />
              <Bone className="skeleton-line skeleton-line--wide" />
              <Bone className="skeleton-line skeleton-line--wide" />
              <Bone className="skeleton-line skeleton-line--medium" />
            </div>
          </div>

          <aside className="skeleton-article__toc" aria-hidden="true">
            <Bone className="skeleton-line skeleton-line--toc-title" />
            {Array.from({ length: 6 }).map((_, index) => (
              <Bone className="skeleton-line skeleton-line--toc" key={index} />
            ))}
          </aside>
        </div>
      </section>
    </main>
  )
}

function GenericSkeleton() {
  return (
    <main className="skeleton-page skeleton-generic">
      <div className="container">
        <Bone className="skeleton-line skeleton-line--eyebrow" />
        <Bone className="skeleton-line skeleton-line--archive-title" />
        <Bone className="skeleton-line skeleton-line--wide" />
        <Bone className="skeleton-line skeleton-line--medium" />
        <Bone className="skeleton-generic__block" />
      </div>
    </main>
  )
}

export function SiteSkeleton() {
  const pathname = usePathname()
  const locale = pathname?.startsWith('/en') ? 'en' : 'fr'
  const label = locale === 'en' ? 'Loading content' : 'Chargement du contenu'

  const normalizedPath = pathname?.replace(/^\/(fr|en)/, '') || '/'

  let content = <GenericSkeleton />

  if (normalizedPath === '/' || normalizedPath === '') {
    content = <HomeSkeleton />
  } else if (/^\/posts\/[^/]+$/.test(normalizedPath)) {
    content = <ArticleSkeleton />
  } else if (normalizedPath.startsWith('/posts')) {
    content = <ArchiveSkeleton />
  } else if (normalizedPath.startsWith('/search')) {
    content = <ArchiveSkeleton search />
  }

  return (
    <div aria-busy="true" aria-live="polite" className="site-skeleton" role="status">
      <span className="sr-only">{label}</span>
      {content}
    </div>
  )
}
