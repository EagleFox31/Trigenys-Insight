import type { Post } from '@/payload-types'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { NewsletterForm } from './NewsletterForm'
import styles from './NewsroomHome.module.css'

const channels = [
  {
    color: '#e07520',
    description:
      "Infrastructure, intelligence artificielle, cybersécurité et produits numériques qui transforment les économies africaines.",
    id: 'technology',
    match: ['tech', 'technologie', 'technology', 'cyber', 'ia', 'ai'],
    title: 'Technologie',
  },
  {
    color: '#15355a',
    description:
      "Marchés, modèles économiques, finance et stratégies d'entreprise observés à partir des faits.",
    id: 'business',
    match: ['business', 'marché', 'market', 'économie', 'finance'],
    title: 'Business',
  },
  {
    color: '#2c5f7a',
    description:
      "Architecture, cloud, données, logiciels et systèmes d'information vus depuis les contraintes opérationnelles.",
    id: 'systems',
    match: ['système', 'system', 'cloud', 'data', 'logiciel', 'software'],
    title: "Systèmes d'information",
  },
  {
    color: '#5e7a3a',
    description:
      "Dynamiques économiques, infrastructures, usages et signaux faibles qui façonnent les marchés du continent.",
    id: 'africa',
    match: ['afrique', 'africa', 'cameroun', 'cameroon'],
    title: 'Afrique',
  },
]

const kindLabels: Record<string, string> = {
  analysis: 'Analyse de fond',
  comparison: 'Comparatif',
  'field-note': 'Note de terrain',
  guide: 'Guide pratique',
}

function asMedia(value: Post['heroImage'] | NonNullable<Post['meta']>['image']) {
  return value && typeof value === 'object' ? value : null
}

function categoryTitle(post: Post) {
  const category = post.categories?.find((item) => item && typeof item === 'object')
  return category && typeof category === 'object' ? category.title || 'Analyse' : 'Analyse'
}

function authorNames(post: Post) {
  return (
    post.populatedAuthors
      ?.map((author) => author.name)
      .filter(Boolean)
      .join(', ') || 'Trigenys Insights'
  )
}

function kindLabel(post: Post) {
  if (!post.kind) return 'Analyse'
  return kindLabels[post.kind] || post.kind
}

function formatDate(value?: null | string, long = false) {
  if (!value) return 'Bientôt'

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: long ? 'long' : 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function editionDate() {
  return new Intl.DateTimeFormat('fr-FR', {
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

function postMatchesChannel(post: Post, terms: string[]) {
  const category = String(categoryTitle(post)).toLowerCase()
  return terms.some((term) => category.includes(term))
}

export function InsightsHome({ posts }: { posts: Post[] }) {
  const featured = posts.find((post) => post.featured) || posts[0]
  const remaining = posts.filter((post) => post.id !== featured?.id)
  const compactStories = remaining.slice(0, 4)
  const editorsPick =
    remaining.find((post) => post.editorsPick) || remaining[4] || remaining[0] || featured
  const latestStories = remaining
    .filter((post) => post.id !== editorsPick?.id)
    .slice(compactStories.length, compactStories.length + 5)
  const trending = remaining.slice(0, 5)

  if (!featured) {
    return (
      <main className={styles.home}>
        <section className={styles.empty}>
          <div className={'insights-shell ' + styles.emptyGrid}>
            <h1>La salle de rédaction est prête.</h1>
            <p>
              Les premiers dossiers restent en brouillon jusqu&apos;à validation de leurs chiffres,
              sources et exemples. Dès publication, cette page basculera automatiquement en
              newsroom.
            </p>
          </div>
        </section>

        <section className="method-section" id="methodologie">
          <div className="insights-shell method-section__grid">
            <div>
              <p className="eyebrow">Notre méthode</p>
              <h2>Des conclusions traçables, pas des classements sortis d&apos;un chapeau.</h2>
            </div>
            <div className="method-section__steps">
              <div>
                <span>01</span>
                <p>Recouper les sources et dater chaque observation.</p>
              </div>
              <div>
                <span>02</span>
                <p>Rendre les hypothèses, limites et méthodes de calcul visibles.</p>
              </div>
              <div>
                <span>03</span>
                <p>Transformer la donnée en décision concrète, contextualisée pour l&apos;Afrique.</p>
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
              <p className="eyebrow">Trigenys Brief</p>
              <h2>Une analyse utile. Pas une avalanche d&apos;e-mails.</h2>
            </div>
            <div>
              <p>
                Recevez les nouveaux dossiers, comparatifs et notes de terrain. Fréquence maîtrisée,
                désinscription en un clic.
              </p>
              <NewsletterForm />
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
            <strong>TRIGENYS INSIGHTS · ÉDITION DU {editionDate().toUpperCase()}</strong>
            <div className={styles.editionMeta}>
              <span className={styles.liveDot} />
              <span>Recherche &amp; analyse · Douala, Cameroun</span>
            </div>
          </div>

          {trending.length > 0 && (
            <div className={styles.signal}>
              <span className={styles.signalLabel}>À suivre</span>
              <div className={styles.signalItems}>
                {trending.slice(0, 3).map((post) => (
                  <Link href={'/posts/' + post.slug} key={post.id}>
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
            aria-label={'Lire ' + featured.title}
            className={styles.visual}
            href={'/posts/' + featured.slug}
          >
            <ArticleImage post={featured} priority />
          </Link>

          <article className={styles.leadCopy}>
            <p className="story-kicker">
              <span>{categoryTitle(featured)}</span> · {kindLabel(featured)}
            </p>
            <h1 className={styles.leadTitle}>
              <Link href={'/posts/' + featured.slug}>{featured.title}</Link>
            </h1>
            <p className={styles.leadDeck}>{featured.excerpt || featured.meta?.description}</p>
            <div className={styles.meta}>
              <span>{authorNames(featured)}</span>
              <span>{formatDate(featured.publishedAt, true)}</span>
              <span>{featured.readingTime || 8} min</span>
            </div>
            <Link className="text-link" href={'/posts/' + featured.slug}>
              Lire l&apos;analyse <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </article>

          {trending.length > 0 && (
            <aside className={styles.trending} aria-label="Tendances">
              <div className={styles.asideHeading}>
                <h2>Tendances</h2>
                <span>Maintenant</span>
              </div>
              <div className={styles.trendingList}>
                {trending.map((post, index) => (
                  <article className={styles.trendingItem} key={post.id}>
                    <span className={styles.trendingNumber}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <Link href={'/posts/' + post.slug}>{post.title}</Link>
                      <span className={styles.trendingMeta}>
                        {categoryTitle(post)} · {post.readingTime || 8} min
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
                <p className="eyebrow">Dernières publications</p>
                <h2>Ce qu&apos;il faut lire maintenant.</h2>
              </div>
              <Link className="text-link" href="/posts">
                Tout voir <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>

            <div className={styles.compactGrid}>
              {compactStories.map((post) => (
                <article className={styles.compactCard} key={post.id}>
                  <Link href={'/posts/' + post.slug}>
                    <ArticleImage post={post} />
                  </Link>
                  <p className="story-kicker">{categoryTitle(post)}</p>
                  <h3>
                    <Link href={'/posts/' + post.slug}>{post.title}</Link>
                  </h3>
                  <span className={styles.compactCardMeta}>
                    {formatDate(post.publishedAt)} · {post.readingTime || 8} min
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
                <h2>Dernières analyses</h2>
                <Link className="text-link" href="/posts">
                  Archives <ArrowRight aria-hidden="true" size={14} />
                </Link>
              </div>

              <div className={styles.latestList}>
                {latestStories.map((post) => (
                  <article className={styles.latestItem} key={post.id}>
                    <Link className={styles.latestThumb} href={'/posts/' + post.slug}>
                      <ArticleImage post={post} />
                    </Link>
                    <div>
                      <p className="story-kicker">{categoryTitle(post)}</p>
                      <h3>
                        <Link href={'/posts/' + post.slug}>{post.title}</Link>
                      </h3>
                      <p>{post.excerpt || post.meta?.description}</p>
                      <span className={styles.latestItemMeta}>
                        {formatDate(post.publishedAt)} · {post.readingTime || 8} min de lecture
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {editorsPick && (
              <aside>
                <div className={styles.editorHeader}>
                  <h2>Choix de la rédaction</h2>
                </div>
                <article className={styles.editorCard}>
                  <Link href={'/posts/' + editorsPick.slug}>
                    <ArticleImage post={editorsPick} />
                  </Link>
                  <p className="story-kicker">
                    {categoryTitle(editorsPick)} · {kindLabel(editorsPick)}
                  </p>
                  <h3 className={styles.editorTitle}>
                    <Link href={'/posts/' + editorsPick.slug}>{editorsPick.title}</Link>
                  </h3>
                  <p className={styles.editorDeck}>
                    {editorsPick.excerpt || editorsPick.meta?.description}
                  </p>
                  <div className={styles.meta}>
                    <span>{authorNames(editorsPick)}</span>
                    <span>{editorsPick.readingTime || 8} min</span>
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
              <p className="eyebrow">Nos desks</p>
              <h2>Quatre angles. Une même exigence.</h2>
            </div>
          </div>

          <div className={styles.channelsGrid}>
            {channels.map((channel) => {
              const channelPost = posts.find((post) => postMatchesChannel(post, channel.match))

              return (
                <article
                  className={styles.channel}
                  id={channel.id}
                  key={channel.id}
                  style={{ '--channel-color': channel.color } as React.CSSProperties}
                >
                  <p className={styles.channelLabel}>Desk {channel.title}</p>
                  <h3>{channel.title}</h3>
                  <p className={styles.channelDescription}>{channel.description}</p>

                  {channelPost ? (
                    <div className={styles.channelStory}>
                      <Link href={'/posts/' + channelPost.slug}>{channelPost.title}</Link>
                      <span>
                        {formatDate(channelPost.publishedAt)} · {channelPost.readingTime || 8} min
                      </span>
                    </div>
                  ) : (
                    <div className={styles.channelStory}>
                      <span>Nouveaux dossiers en préparation.</span>
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
            <p className="eyebrow">Notre méthode</p>
            <h2>Des conclusions traçables, pas des classements sortis d&apos;un chapeau.</h2>
          </div>
          <div className="method-section__steps">
            <div>
              <span>01</span>
              <p>Recouper les sources et dater chaque observation.</p>
            </div>
            <div>
              <span>02</span>
              <p>Rendre les hypothèses, limites et méthodes de calcul visibles.</p>
            </div>
            <div>
              <span>03</span>
              <p>Transformer la donnée en décision concrète, contextualisée pour l&apos;Afrique.</p>
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
            <p className="eyebrow">Trigenys Brief</p>
            <h2>Une analyse utile. Pas une avalanche d&apos;e-mails.</h2>
          </div>
          <div>
            <p>
              Recevez les nouveaux dossiers, comparatifs et notes de terrain. Fréquence maîtrisée,
              désinscription en un clic.
            </p>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </main>
  )
}
