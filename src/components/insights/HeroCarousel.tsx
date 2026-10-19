'use client'

import Image from 'next/image'
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { SiteLocale } from '@/i18n/config'
import type { ArticlePlacement } from '@/lib/analytics/events'
import { ArticleImpressionBoundary } from '@/components/analytics/ArticleImpressionBoundary'
import { TrackedArticleLink } from '@/components/analytics/TrackedArticleLink'
import styles from './HeroCarousel.module.css'

export type HeroStory = {
  id: number
  slug: string
  href: string
  title: string
  excerpt: string
  category: string
  categoryLabel: string
  kindLabel: string
  author: string
  date: string
  minutes: number
  image: { url: string; alt: string } | null
}
const ROTATION_MS = 8000

export function HeroCarousel({ stories, locale }: { stories: HeroStory[]; locale: SiteLocale }) {
  const fr = locale === 'fr'
  const id = useId()
  const root = useRef<HTMLElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [desktop, setDesktop] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(true)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const count = stories.length
  const index = Math.min(active, Math.max(0, count - 1))
  const running =
    count > 1 && desktop && !reducedMotion && !paused && !hovered && visible && pageVisible

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      setDesktop(wide.matches)
      setReducedMotion(reduced.matches)
    }
    const visibility = () => setPageVisible(document.visibilityState === 'visible')
    sync()
    visibility()
    wide.addEventListener('change', sync)
    reduced.addEventListener('change', sync)
    document.addEventListener('visibilitychange', visibility)
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.25)),
      { threshold: 0.25 },
    )
    if (root.current) observer.observe(root.current)
    return () => {
      wide.removeEventListener('change', sync)
      reduced.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', visibility)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!running) return
    const timer = window.setTimeout(
      () => setActive((current) => (current + 1) % count),
      ROTATION_MS,
    )
    return () => window.clearTimeout(timer)
  }, [running, index, count])

  function select(next: number) {
    setPaused(true)
    setActive((next + count) % count)
  }

  if (!count) return null

  return (
    <section
      ref={root}
      className={styles.hero}
      aria-label={fr ? 'À la une' : 'Featured stories'}
      aria-roledescription={fr ? 'carrousel' : 'carousel'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}
    >
      <div className={'insights-shell ' + styles.layout}>
        <div className={styles.toolbar}>
          <h1>{fr ? 'À la une' : 'In focus'}</h1>
          {count > 1 && (
            <div className={styles.controls}>
              {desktop && !reducedMotion && (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  aria-label={
                    paused
                      ? fr
                        ? 'Lancer le défilement automatique'
                        : 'Start automatic rotation'
                      : fr
                        ? 'Mettre le défilement en pause'
                        : 'Pause automatic rotation'
                  }
                  onClick={() => setPaused((value) => !value)}
                >
                  {paused ? (
                    <Play size={16} aria-hidden="true" />
                  ) : (
                    <Pause size={16} aria-hidden="true" />
                  )}
                </button>
              )}
              <span className={styles.counter} aria-hidden="true">
                {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
              </span>
              <button
                type="button"
                aria-label={fr ? 'Article précédent' : 'Previous story'}
                aria-controls={`${id}-slides`}
                onClick={() => select(index - 1)}
              >
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={fr ? 'Article suivant' : 'Next story'}
                aria-controls={`${id}-slides`}
                onClick={() => select(index + 1)}
              >
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        <div
          id={`${id}-slides`}
          className={styles.slides}
          aria-live={running ? 'off' : 'polite'}
          aria-atomic="false"
          onTouchStart={(event) => {
            const t = event.touches[0]
            touch.current = t ? { x: t.clientX, y: t.clientY } : null
          }}
          onTouchEnd={(event) => {
            const start = touch.current
            const end = event.changedTouches[0]
            touch.current = null
            if (!start || !end || count < 2) return
            const dx = end.clientX - start.x
            const dy = end.clientY - start.y
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5)
              select(index + (dx < 0 ? 1 : -1))
          }}
          onTouchCancel={() => {
            touch.current = null
          }}
        >
          {stories.map((story, position) => {
            const placement = `home_hero_${position + 1}` as ArticlePlacement
            const tracking = { slug: story.slug, category: story.category, locale, placement }
            return (
              <div
                key={story.id}
                hidden={index !== position}
                role="group"
                aria-roledescription={fr ? 'diapositive' : 'slide'}
                aria-label={`${position + 1} / ${count}`}
              >
                {index === position && (
                  <ArticleImpressionBoundary key={story.id} {...tracking} enabled={pageVisible}>
                    <article className={styles.slide}>
                      <TrackedArticleLink
                        {...tracking}
                        className={styles.image}
                        href={story.href}
                        aria-label={`${fr ? 'Lire' : 'Read'} : ${story.title}`}
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        {story.image ? (
                          <Image
                            src={story.image.url}
                            alt={story.image.alt}
                            fill
                            priority={position === 0}
                            sizes="(max-width: 760px) 100vw, (max-width: 1100px) 66vw, 56vw"
                          />
                        ) : (
                          <span className={styles.placeholder}>TI</span>
                        )}
                        <span className={styles.imageLabel}>{story.categoryLabel}</span>
                      </TrackedArticleLink>
                      <div className={styles.copy}>
                        <p className={styles.kicker}>
                          {story.categoryLabel} · {story.kindLabel}
                        </p>
                        <h2>
                          <TrackedArticleLink {...tracking} href={story.href}>
                            {story.title}
                          </TrackedArticleLink>
                        </h2>
                        {story.excerpt && <p className={styles.excerpt}>{story.excerpt}</p>}
                        <p className={styles.meta}>
                          {story.author} · {story.date} · {story.minutes} min
                        </p>
                        <TrackedArticleLink {...tracking} href={story.href} className={styles.read}>
                          {fr ? 'Lire l’analyse' : 'Read the story'}{' '}
                          <ArrowRight size={17} aria-hidden="true" />
                        </TrackedArticleLink>
                      </div>
                    </article>
                  </ArticleImpressionBoundary>
                )}
              </div>
            )
          })}
        </div>
        {count > 1 && (
          <nav
            className={styles.picker}
            aria-label={fr ? 'Choisir un article à la une' : 'Choose a featured story'}
          >
            {stories.map((story, position) => (
              <button
                key={story.id}
                type="button"
                className={styles.choice}
                aria-current={index === position ? 'true' : undefined}
                aria-controls={`${id}-slides`}
                onClick={() => select(position)}
              >
                <span className={styles.number}>{String(position + 1).padStart(2, '0')}</span>
                <span>
                  <span className={styles.choiceCategory}>{story.categoryLabel}</span>
                  <span className={styles.choiceTitle}>{story.title}</span>
                </span>
                {index === position && (
                  <span className={styles.progress} aria-hidden="true">
                    <span
                      key={`${story.id}-${running}`}
                      style={{ animationPlayState: running ? 'running' : 'paused' }}
                    />
                  </span>
                )}
              </button>
            ))}
          </nav>
        )}
      </div>
    </section>
  )
}
