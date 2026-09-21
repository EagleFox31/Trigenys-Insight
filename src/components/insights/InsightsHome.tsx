import type { Post } from '@/payload-types'
import type { SiteLocale } from '@/i18n/config'
import { withLocale } from '@/i18n/config'
import { formatPostDate, postKindLabel, primaryCategoryLabel } from '@/i18n/content'
import { getMessages } from '@/i18n/messages'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { NewsletterForm } from './NewsletterForm'
import styles from './NewsroomHome.module.css'

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

function editionDate(locale: SiteLocale) {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function ArticleImage({ post, priority = false }: { post: Post; priority?: boolean }) {
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
        sizes="(max-width: 760px) 100vw, (max-width: 1050px) 50vw, 36vw"
        src={media.url}
      />
    </div>
  )
}

function categorySlug(post: Post) {
  const category = post.categories?.find((item) => item && typeof item === 'object')
  return category && typeof category === 'object' ? category.slug || '' : ''
}

function postMatchesChannel(post: Post, channel: string) {
  const slug = categorySlug(post)

  if (channel === 'technology') return slug === 'technology'
  if (channel === 'business') return slug === 'business'
  if (channel === 'systems') return slug === 'information-systems'
  if (channel === 'africa') return slug === 'africa'

  return false
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
  const remaining = posts.filter((post) => post.id !== featured?.id)
  const compactStories = remaining.slice(0, 4)
  const editorsPick =
    remaining.find((post) => post.editorsPick) || remaining[4] || remaining[0] || featured
  const latestStories = remaining
    .filter((post) => post.id !== editorsPick?.id)
    .slice(compactStories.length, compactStories.length + 5)
  const trending = remaining.slice(0, 5)

  const channels = [
    {
      color: '#e07520',
      description: t.pillars.technology.description,
      id: 'technology',
      title: t.pillars.technology.title,
    },
    {
      color: '#15355a',
      description: t.pillars.business.description,
      id: 'business',
      title: t.pillars.business.title,
    },
    {
      color: '#2c5f7a',
      description: t.pillars.systems.description,
      id: 'systems',
      title: t.pillars.systems.title,
    },
    {
      color: '#5e7a3a',
      description: t.pillars.africa.description,
      id: 'africa',
      title: t.pillars.africa.title,
    },
  ]

  if (!featured) {
    return (
      <main className={styles.home}>
        <section className={styles.empty}>
          <div className={'insights-shell ' + styles.emptyGrid}>
            <h1>{t.newsroom.emptyTitle}</h1>
            <p>{t.newsroom.emptyText}</p>
          </div>
        </section>

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

  return (
    <main className={styles.home}>
      <section className={styles.edition}>
        <div className="insights-shell">
          <div className={styles.editionTop}>
            <strong>
              TRIGENYS INSIGHTS · {t.newsroom.edition.toUpperCase()} {editionDate(locale).toUpperCase()}
            </strong>
            <div className={styles.editionMeta}>
              <span className={styles.liveDot} />
              <span>{t.newsroom.researchMeta}</span>
            </div>
          </div>

          {trending.length > 0 && (
            <div className={styles.signal}>
              <span className={styles.signalLabel}>{t.newsroom.follow}</span>
              <div className={styles.signalItems}>
                {trending.slice(0, 3).map((post) => (
                  <Link href={withLocale(locale, `/posts/${post.slug}`)} key={post.id}>
                    {post.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className={styles.lead}>
        <div className={'insights-shell ' + styles.leadGrid}>
          <Link
            aria-label={`${t.home.read} ${featured.title}`}
            className={styles.visual}
            href={withLocale(locale, `/posts/${featured.slug}`)}
          >
            <ArticleImage post={featured} priority />
          </Link>

          <article className={styles.leadCopy}>
            <p className="story-kicker">
              <span>{primaryCategoryLabel(featured, locale)}</span> · {postKindLabel(featured, locale)}
            </p>
            <h1 className={styles.leadTitle}>
              <Link href={withLocale(locale, `/posts/${featured.slug}`)}>
                {featured.title}
              </Link>
            </h1>
            <p className={styles.leadDeck}>{featured.excerpt || featured.meta?.description}</p>
            <div className={styles.meta}>
              <span>{authorNames(featured)}</span>
              <span>{formatPostDate(featured.publishedAt, locale, true)}</span>
              <span>{featured.readingTime || 8} {t.home.minutes}</span>
            </div>
            <Link
              className="text-link"
              href={withLocale(locale, `/posts/${featured.slug}`)}
            >
              {t.home.read} <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </article>

          {trending.length > 0 && (
            <aside className={styles.trending} aria-label={t.newsroom.trending}>
              <div className={styles.asideHeading}>
                <h2>{t.newsroom.trending}</h2>
                <span>{t.newsroom.now}</span>
              </div>
              <div className={styles.trendingList}>
                {trending.map((post, index) => (
                  <article className={styles.trendingItem} key={post.id}>
                    <span className={styles.trendingNumber}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <Link href={withLocale(locale, `/posts/${post.slug}`)}>
                        {post.title}
                      </Link>
                      <span className={styles.trendingMeta}>
                        {primaryCategoryLabel(post, locale)} · {post.readingTime || 8} {t.home.minutes}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          )}
        </div>
      </section>

      {compactStories.length > 0 && (
        <section className={styles.compact}>
          <div className="insights-shell">
            <div className={styles.sectionBar}>
              <div>
                <p className="eyebrow">{t.newsroom.latestPublications}</p>
                <h2>{t.newsroom.readNow}</h2>
              </div>
              <Link className="text-link" href={withLocale(locale, '/posts')}>
                {t.newsroom.viewAll} <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>

            <div className={styles.compactGrid}>
              {compactStories.map((post) => (
                <article className={styles.compactCard} key={post.id}>
                  <Link href={withLocale(locale, `/posts/${post.slug}`)}>
                    <ArticleImage post={post} />
                  </Link>
                  <p className="story-kicker">{primaryCategoryLabel(post, locale)}</p>
                  <h3>
                    <Link href={withLocale(locale, `/posts/${post.slug}`)}>
                      {post.title}
                    </Link>
                  </h3>
                  <span className={styles.compactCardMeta}>
                    {formatPostDate(post.publishedAt, locale)} · {post.readingTime || 8} {t.home.minutes}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {(latestStories.length > 0 || editorsPick) && (
        <section className={styles.desk} id="analyses">
          <div className={'insights-shell ' + styles.deskGrid}>
            <div>
              <div className={styles.latestHeader}>
                <h2>{t.newsroom.latestAnalysis}</h2>
                <Link className="text-link" href={withLocale(locale, '/posts')}>
                  {t.newsroom.archives} <ArrowRight aria-hidden="true" size={14} />
                </Link>
              </div>

              <div className={styles.latestList}>
                {latestStories.map((post) => (
                  <article className={styles.latestItem} key={post.id}>
                    <Link
                      className={styles.latestThumb}
                      href={withLocale(locale, `/posts/${post.slug}`)}
                    >
                      <ArticleImage post={post} />
                    </Link>
                    <div>
                      <p className="story-kicker">{primaryCategoryLabel(post, locale)}</p>
                      <h3>
                        <Link href={withLocale(locale, `/posts/${post.slug}`)}>
                          {post.title}
                        </Link>
                      </h3>
                      <p>{post.excerpt || post.meta?.description}</p>
                      <span className={styles.latestItemMeta}>
                        {formatPostDate(post.publishedAt, locale)} · {post.readingTime || 8}{' '}
                        {t.home.minutesReading}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {editorsPick && (
              <aside>
                <div className={styles.editorHeader}>
                  <h2>{t.newsroom.editorsPick}</h2>
                </div>
                <article className={styles.editorCard}>
                  <Link href={withLocale(locale, `/posts/${editorsPick.slug}`)}>
                    <ArticleImage post={editorsPick} />
                  </Link>
                  <p className="story-kicker">
                    {primaryCategoryLabel(editorsPick, locale)} · {postKindLabel(editorsPick, locale)}
                  </p>
                  <h3 className={styles.editorTitle}>
                    <Link href={withLocale(locale, `/posts/${editorsPick.slug}`)}>
                      {editorsPick.title}
                    </Link>
                  </h3>
                  <p className={styles.editorDeck}>
                    {editorsPick.excerpt || editorsPick.meta?.description}
                  </p>
                  <div className={styles.meta}>
                    <span>{authorNames(editorsPick)}</span>
                    <span>{editorsPick.readingTime || 8} {t.home.minutes}</span>
                  </div>
                </article>
              </aside>
            )}
          </div>
        </section>
      )}

      <section className={styles.channels}>
        <div className="insights-shell">
          <div className={styles.sectionBar}>
            <div>
              <p className="eyebrow">{t.newsroom.desks}</p>
              <h2>{t.newsroom.desksTitle}</h2>
            </div>
          </div>

          <div className={styles.channelsGrid}>
            {channels.map((channel) => {
              const channelPost = posts.find((post) => postMatchesChannel(post, channel.id))

              return (
                <article
                  className={styles.channel}
                  id={channel.id}
                  key={channel.id}
                  style={{ '--channel-color': channel.color } as React.CSSProperties}
                >
                  <p className={styles.channelLabel}>
                    {t.newsroom.deskPrefix} {channel.title}
                  </p>
                  <h3>{channel.title}</h3>
                  <p className={styles.channelDescription}>{channel.description}</p>

                  {channelPost ? (
                    <div className={styles.channelStory}>
                      <Link href={withLocale(locale, `/posts/${channelPost.slug}`)}>
                        {channelPost.title}
                      </Link>
                      <span>
                        {formatPostDate(channelPost.publishedAt, locale)} ·{' '}
                        {channelPost.readingTime || 8} {t.home.minutes}
                      </span>
                    </div>
                  ) : (
                    <div className={styles.channelStory}>
                      <span>{t.newsroom.newDossiers}</span>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </section>

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
