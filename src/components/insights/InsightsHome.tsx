import type { Post } from '@/payload-types'
import { ArrowRight, BarChart3, Cpu, Globe2, Network, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { NewsletterForm } from './NewsletterForm'

const pillars = [
  {
    color: '#e07520',
    description:
      "Les infrastructures, l'IA et la cybersécurité qui reconfigurent les économies africaines.",
    icon: Network,
    id: 'technology',
    title: 'Technologie',
  },
  {
    color: '#15355a',
    description:
      "Marchés, modèles économiques et stratégies d'entreprise analysés sans poudre aux yeux.",
    icon: BarChart3,
    id: 'business',
    title: 'Business',
  },
  {
    color: '#2c5f7a',
    description:
      'Architecture, données, cloud et logiciels vus depuis les réalités opérationnelles du continent.',
    icon: Cpu,
    id: 'systems',
    title: "Systèmes d'information",
  },
  {
    color: '#5e7a3a',
    description:
      "Les décisions publiques, dynamiques sociales et signaux faibles qui dessinent l'Afrique de demain.",
    icon: Globe2,
    id: 'africa',
    title: 'Afrique',
  },
]

function asMedia(value: Post['heroImage'] | NonNullable<Post['meta']>['image']) {
  return value && typeof value === 'object' ? value : null
}

function categoryTitle(post: Post) {
  const category = post.categories?.find((item) => item && typeof item === 'object')
  return category && typeof category === 'object' ? category.title : 'Analyse'
}

function authorNames(post: Post) {
  return (
    post.populatedAuthors
      ?.map((author) => author.name)
      .filter(Boolean)
      .join(', ') || 'Trigenys Insights'
  )
}

function formatDate(value?: null | string) {
  if (!value) return 'Bientôt'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value))
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
        sizes="(max-width: 900px) 100vw, 46vw"
        src={media.url}
      />
    </div>
  )
}

export function InsightsHome({ posts }: { posts: Post[] }) {
  const featured = posts.find((post) => post.featured) || posts[0]
  const remaining = posts.filter((post) => post.id !== featured?.id).slice(0, 6)

  return (
    <main>
      <section className="insights-intro">
        <div className="insights-shell">
          <p className="eyebrow">Publication indépendante · Douala, Cameroun</p>
          <div className="insights-intro__grid">
            <div>
              <h1>
                Comprendre les systèmes.
                <br />
                <em>Décider avec lucidité.</em>
              </h1>
            </div>
            <div className="insights-intro__copy">
              <p>
                Trigenys Insights croise recherche, données et expérience terrain pour éclairer les
                décisions en technologie, cybersécurité, business et transformation numérique.
              </p>
              <a className="text-link" href="#analyses">
                Explorer nos champs d&apos;analyse <ArrowRight aria-hidden="true" size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {featured ? (
        <section className="featured-story">
          <div className="insights-shell featured-story__grid">
            <Link
              aria-label={`Lire ${featured.title}`}
              className="featured-story__visual"
              href={`/posts/${featured.slug}`}
            >
              <ArticleImage post={featured} priority />
            </Link>
            <article className="featured-story__content">
              <p className="story-kicker">
                <span>{categoryTitle(featured)}</span> · {featured.kind || 'Analyse de fond'}
              </p>
              <h2>
                <Link href={`/posts/${featured.slug}`}>{featured.title}</Link>
              </h2>
              <p className="story-deck">{featured.excerpt || featured.meta?.description}</p>
              <p className="story-meta">
                {authorNames(featured)} · {formatDate(featured.publishedAt)} ·{' '}
                {featured.readingTime || 8} min
              </p>
              <Link className="text-link" href={`/posts/${featured.slug}`}>
                Lire l&apos;analyse <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </article>
          </div>
        </section>
      ) : (
        <section className="launch-note">
          <div className="insights-shell launch-note__inner">
            <div>
              <p className="story-kicker">Dossier fondateur · En préparation</p>
              <h2>Le premier article est déjà dans la salle de rédaction.</h2>
            </div>
            <p>
              Le socle éditorial est prêt. Les articles restent en brouillon jusqu&apos;à validation
              de leurs chiffres, sources et exemples — le bouton Publier mérite un peu de respect.
            </p>
          </div>
        </section>
      )}

      <section className="analysis-pillars" id="analyses">
        <div className="insights-shell">
          <div className="section-heading">
            <p className="eyebrow">Nos champs d&apos;analyse</p>
            <h2>Quatre angles. Une même exigence.</h2>
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
                <p className="eyebrow">Dernières publications</p>
                <h2>Les analyses à lire maintenant.</h2>
              </div>
              <Link className="text-link" href="/posts">
                Voir toutes les analyses <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
            <div className="story-grid">
              {remaining.map((post) => (
                <article className="story-card" key={post.id}>
                  <Link href={`/posts/${post.slug}`}>
                    <ArticleImage post={post} />
                  </Link>
                  <p className="story-kicker">{categoryTitle(post)}</p>
                  <h3>
                    <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                  </h3>
                  <p>{post.excerpt || post.meta?.description}</p>
                  <span className="story-meta">{post.readingTime || 8} min de lecture</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

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
