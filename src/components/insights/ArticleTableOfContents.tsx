'use client'

import type { SiteLocale } from '@/i18n/config'
import { BookOpenText, Clock3, LibraryBig } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { trackEditorialEvent } from '@/lib/analytics/client'
import type { EditorialAnalyticsEvent } from '@/lib/analytics/events'
import { readingEventsToEmit } from '@/lib/analytics/reading'

type Heading = {
  id: string
  level: 2 | 3
  text: string
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function ArticleTableOfContents({
  locale,
  slug,
  readingTime,
  sourceCount,
  analyticsEnabled = true,
}: {
  locale: SiteLocale
  slug: string
  readingTime?: number | null
  sourceCount: number
  analyticsEnabled?: boolean
}) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState('')
  const [progress, setProgress] = useState(0)
  const firedMilestones = useRef<Set<EditorialAnalyticsEvent>>(new Set())
  const activeArticleKey = useRef('')

  const copy =
    locale === 'fr'
      ? {
          title: 'Dans cette analyse',
          mobileTitle: 'Sommaire de l’analyse',
          reading: 'Lecture',
          sources: 'Sources',
          minutes: 'min',
        }
      : {
          title: 'In this analysis',
          mobileTitle: 'Article contents',
          reading: 'Reading',
          sources: 'Sources',
          minutes: 'min',
        }

  useEffect(() => {
    const article = document.querySelector<HTMLElement>('[data-article-reading-main]')
    const content = article?.querySelector<HTMLElement>('.article-content')
    if (!article || !content) return

    const articleKey = `${locale}:${slug}`
    if (activeArticleKey.current !== articleKey) {
      activeArticleKey.current = articleKey
      firedMilestones.current = new Set()

      if (analyticsEnabled) {
        trackEditorialEvent('article_view', {
          slug,
          locale,
          context: 'article',
        })
      }
    }

    const headingNodes = Array.from(content.querySelectorAll<HTMLHeadingElement>('h2, h3'))
    const seen = new Map<string, number>()

    const items = headingNodes
      .map((heading, index) => {
        const text = heading.textContent?.trim() || ''
        if (!text) return null

        const base = slugify(text) || `section-${index + 1}`
        const occurrence = seen.get(base) || 0
        seen.set(base, occurrence + 1)
        const id = occurrence === 0 ? base : `${base}-${occurrence + 1}`

        heading.id = heading.id || id
        heading.classList.add('article-scroll-target')

        return {
          id: heading.id,
          level: heading.tagName === 'H3' ? 3 : 2,
          text,
        } satisfies Heading
      })
      .filter((heading): heading is Heading => Boolean(heading))

    const initialStateFrame = window.requestAnimationFrame(() => {
      setHeadings(items)
      setActiveId(items[0]?.id || '')
    })

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        const next = visible[0]?.target as HTMLElement | undefined
        if (next?.id) setActiveId(next.id)
      },
      {
        rootMargin: '-18% 0px -68% 0px',
        threshold: [0, 1],
      },
    )

    headingNodes.forEach((heading) => observer.observe(heading))

    const updateProgress = () => {
      const rect = article.getBoundingClientRect()
      const articleTop = window.scrollY + rect.top
      const start = articleTop - 140
      const end = articleTop + article.offsetHeight - window.innerHeight + 120
      const range = Math.max(end - start, 1)
      const nextProgress = Math.min(1, Math.max(0, (window.scrollY - start) / range))
      setProgress(nextProgress)

      if (analyticsEnabled && document.visibilityState === 'visible') {
        for (const event of readingEventsToEmit(nextProgress, firedMilestones.current)) {
          firedMilestones.current.add(event)
          trackEditorialEvent(event, {
            slug,
            locale,
            context: 'article',
          })
        }
      }
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)

    return () => {
      window.cancelAnimationFrame(initialStateFrame)
      observer.disconnect()
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [analyticsEnabled, locale, slug])

  if (headings.length === 0) return null

  const nav = (
    <nav aria-label={copy.title} className="article-toc__nav">
      {headings.map((heading, index) => (
        <a
          aria-current={activeId === heading.id ? 'location' : undefined}
          className={heading.level === 3 ? 'is-subsection' : undefined}
          href={`#${heading.id}`}
          key={heading.id}
          onClick={() => {
            if (!analyticsEnabled) return

            trackEditorialEvent('toc_click', {
              slug,
              locale,
              context: `section-${index + 1}-h${heading.level}`,
            })
          }}
        >
          <span className="article-toc__marker" />
          <span>{heading.text}</span>
        </a>
      ))}
    </nav>
  )

  return (
    <>
      <div aria-hidden="true" className="article-reading-progress">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      <details className="article-toc article-toc--mobile">
        <summary>
          <BookOpenText aria-hidden="true" size={17} strokeWidth={1.8} />
          <span>{copy.mobileTitle}</span>
        </summary>
        {nav}
      </details>

      <aside aria-label={copy.title} className="article-toc article-toc--desktop">
        <div className="article-toc__panel">
          <div className="article-toc__heading">
            <span>{copy.title}</span>
            <strong>{Math.round(progress * 100)}%</strong>
          </div>

          <div className="article-toc__track" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>

          {nav}

          <div className="article-toc__meta">
            {readingTime ? (
              <span>
                <Clock3 aria-hidden="true" size={14} strokeWidth={1.7} />
                {copy.reading} · {readingTime} {copy.minutes}
              </span>
            ) : null}
            {sourceCount > 0 ? (
              <span>
                <LibraryBig aria-hidden="true" size={14} strokeWidth={1.7} />
                {copy.sources} · {sourceCount}
              </span>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  )
}
