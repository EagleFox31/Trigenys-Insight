import type { Post } from '@/payload-types'
import type { SiteLocale } from '@/i18n/config'
import { withLocale } from '@/i18n/config'
import { formatPostDate, postKindLabel, primaryCategoryLabel } from '@/i18n/content'
import { getMessages } from '@/i18n/messages'
import { ArrowRight, BarChart3, Cpu, Globe2, Network, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { NewsletterForm } from './NewsletterForm'

function asMedia(value: Post['heroImage'] | NonNullable<Post['meta']>['image']) {
  return value && typeof value === 'object' ? value : null
}

function authorNames(post: Post) {
  return (
    post.populatedAuthors
      ?.map((author) => author.name)
      .filter(Boolean)
      .join(', ') || 'Trigenys Insights'
  )
}

function ArticleImage({
  post,
  priority = false,
}: {
  post: Post
  priority?: boolean
}) {
  const media = asMedia(post.heroImage) || asMedia(post.meta?.image)

  if (!media?.url) {
    return (
      <div className="article-image article-image--placeholder">
        <span>TI</span>
      </div>
    )
  }

  return (
    <div className="article-image">
      <Image
        alt={media.alt || ''}
        fill
        priority={priority}
        sizes="(max-width: 900px) 100vw, 46vw"
        src={media.url}
      />
    </div>
  )
}

export function InsightsHome({
  locale,
  posts,
}: {
  locale: SiteLocale
  posts: Post[]
}) {
  const t = getMessages(locale)
  const featured = posts.find((post) => post.featured) || posts[0]
  const remaining = posts.filter((post) => post.id !== featured?.id).slice(0, 6)

  const pillars = [
    {
      color: '#e07520',
      description: t.pillars.technology.description,
      icon: Network,
      id: 'technology',
      title: t.pillars.technology.title,
    },
    {
      color: '#15355a',
      description: t.pillars.business.description,
      icon: BarChart3,
      id: 'business',
      title: t.pillars.business.title,
    },
    {
      color: '#2c5f7a',
      description: t.pillars.systems.description,
      icon: Cpu,
      id: 'systems',
      title: t.pillars.systems.title,
    },
    {
      color: '#5e7a3a',
      description: t.pillars.africa.description,
      icon: Globe2,
      id: 'africa',
      title: t.pillars.africa.title,
    },
  ]

  return (
    <main>
      <section className="insights-intro">
        <div className="insights-shell">
          <p className="eyebrow">{t.home.publication}</p>
          <div className="insights-intro__grid">
            <div>
              <h1>
                {t.home.titleLine1}
                <br />
                <em>{t.home.titleLine2}</em>
              </h1>
            </div>
            <div className="insights-intro__copy">
              <p>{t.home.intro}</p>
              <a className="text-link" href="#analyses">
                {t.home.explore} <ArrowRight aria-hidden="true" size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {featured ? (
        <section className="featured-story">
          <div className="insights-shell featured-story__grid">
            <Link
              aria-label={`${t.home.read} ${featured.title}`}
              className="featured-story__visual"
              href={withLocale(locale, `/posts/${featured.slug}`)}
            >
              <ArticleImage post={featured} priority />
            </Link>
            <article className="featured-story__content">
              <p className="story-kicker">
                <span>{primaryCategoryLabel(featured, locale)}</span> · {postKindLabel(featured, locale)}
              </p>
              <h2>
                <Link href={withLocale(locale, `/posts/${featured.slug}`)}>
                  {featured.title}
                </Link>
              </h2>
              <p className="story-deck">{featured.excerpt || featured.meta?.description}</p>
              <p className="story-meta">
                {authorNames(featured)} · {formatPostDate(featured.publishedAt, locale, true)} ·{' '}
                {featured.readingTime || 8} {t.home.minutes}
              </p>
              <Link className="text-link" href={withLocale(locale, `/posts/${featured.slug}`)}>
                {t.home.read} <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </article>
          </div>
        </section>
      ) : (
        <section className="launch-note">
          <div className="insights-shell launch-note__inner">
            <div>
              <p className="story-kicker">{t.home.founderKicker}</p>
              <h2>{t.home.founderTitle}</h2>
            </div>
            <p>{t.home.founderText}</p>
          </div>
        </section>
      )}

      <section className="analysis-pillars" id="analyses">
        <div className="insights-shell">
          <div className="section-heading">
            <p className="eyebrow">{t.home.fields}</p>
            <h2>{t.home.fieldsTitle}</h2>
          </div>
          <div className="pillar-grid">
            {pillars.map(({ color, description, icon: Icon, id, title }) => (
              <article
                className="pillar"
                id={id}
                key={id}
                style={{ '--pillar-color': color } as React.CSSProperties}
              >
                <Icon aria-hidden="true" size={25} strokeWidth={1.6} />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {remaining.length > 0 && (
        <section className="latest-stories">
          <div className="insights-shell">
            <div className="section-heading section-heading--row">
              <div>
                <p className="eyebrow">{t.home.latest}</p>
                <h2>{t.home.latestTitle}</h2>
              </div>
              <Link className="text-link" href={withLocale(locale, '/posts')}>
                {t.home.viewAll} <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
            <div className="story-grid">
              {remaining.map((post) => (
                <article className="story-card" key={post.id}>
                  <Link href={withLocale(locale, `/posts/${post.slug}`)}>
                    <ArticleImage post={post} />
                  </Link>
                  <p className="story-kicker">{primaryCategoryLabel(post, locale)}</p>
                  <h3>
                    <Link href={withLocale(locale, `/posts/${post.slug}`)}>{post.title}</Link>
                  </h3>
                  <p>{post.excerpt || post.meta?.description}</p>
                  <span className="story-meta">
                    {post.readingTime || 8} {t.home.minutesReading}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="method-section" id="methodologie">
        <div className="insights-shell method-section__grid">
          <div>
            <p className="eyebrow">{t.home.method}</p>
            <h2>{t.home.methodTitle}</h2>
          </div>
          <div className="method-section__steps">
            <div>
              <span>01</span>
              <p>{t.home.method1}</p>
            </div>
            <div>
              <span>02</span>
              <p>{t.home.method2}</p>
            </div>
            <div>
              <span>03</span>
              <p>{t.home.method3}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="newsletter-section" id="newsletter">
        <div className="insights-shell newsletter-section__grid">
          <div>
            <div className="newsletter-section__icon">
              <ShieldCheck aria-hidden="true" size={22} />
            </div>
            <p className="eyebrow">{t.home.brief}</p>
            <h2>{t.home.briefTitle}</h2>
          </div>
          <div>
            <p>{t.home.briefText}</p>
            <NewsletterForm locale={locale} />
          </div>
        </div>
      </section>
    </main>
  )
}
