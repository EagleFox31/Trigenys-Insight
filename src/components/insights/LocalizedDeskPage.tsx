import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDown } from 'lucide-react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { CollectionArchive } from '@/components/CollectionArchive'
import type { CardPostData } from '@/components/Card'
import type { SiteLocale } from '@/i18n/config'
import {
  getEditorialRubric,
  localizedRubricPath,
  type EditorialRubricId,
} from '@/editorial/rubrics'
import { absoluteCanonicalURL, buildBreadcrumbJsonLd, serializeJsonLd } from '@/seo/structuredData'
import { HeroCarousel } from './HeroCarousel'
import { toHeroStory } from './heroStories'
import { queryDeskPosts, selectDeskHighlights } from './deskData'
import styles from './DeskPage.module.css'

export async function LocalizedDeskPage({
  locale,
  desk,
}: {
  locale: SiteLocale
  desk: EditorialRubricId
}) {
  const rubric = getEditorialRubric(desk)
  const copy = { title: rubric.title[locale], description: rubric.description[locale] }
  const path = localizedRubricPath(rubric, locale)
  const payload = await getPayload({ config: configPromise })

  const posts = await queryDeskPosts(payload, desk, locale)
  const highlights = await selectDeskHighlights(payload, posts, locale)
  const highlightedIds = new Set(highlights.posts.map((post) => post.id))
  const archivePosts = posts.filter((post) => !highlightedIds.has(post.id))
  const fr = locale === 'fr'
  const count = new Intl.NumberFormat(fr ? 'fr-CM' : 'en-GB').format(posts.length)
  const countLabel = fr
    ? posts.length === 1
      ? 'article disponible'
      : 'articles disponibles'
    : posts.length === 1
      ? 'article available'
      : 'articles available'
  const highlightHeading =
    highlights.kind === 'popular'
      ? fr
        ? 'Les plus lus sur 7 jours'
        : 'Most read in the past 7 days'
      : fr
        ? 'À la une dans cette rubrique'
        : 'Featured in this section'
  // Only send the small card presentation to the grid, never the article bodies.
  const cards: CardPostData[] = archivePosts.map((post) => ({
    title: post.title,
    slug: post.slug,
    categories: post.categories,
    heroImage: post.heroImage,
    meta: { ...post.meta, description: post.meta?.description || post.excerpt || '' },
  }))

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: locale === 'fr' ? 'Accueil' : 'Home', path: `/${locale}` },
    { name: copy.title, path },
  ])

  return (
    <main className={styles.page}>
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <header className={'insights-shell ' + styles.header}>
        <div className={styles.headingRow}>
          <div>
            <p className="eyebrow">{fr ? 'Rubrique' : 'Section'}</p>
            <h1 className={styles.title}>{copy.title}</h1>
          </div>
          <a
            className={styles.count}
            href={archivePosts.length || !posts.length ? '#articles' : '#desk-highlights'}
            aria-label={`${fr ? 'Voir' : 'View'} ${count} ${countLabel}`}
          >
            <strong>{count}</strong>
            <span>{countLabel}</span>
            <ArrowDown aria-hidden="true" size={18} />
          </a>
        </div>
        <p className={styles.description}>{copy.description}</p>
      </header>

      <HeroCarousel
        sectionId="desk-highlights"
        locale={locale}
        variant="desk"
        headingLevel={2}
        heading={highlightHeading}
        stories={highlights.posts.map((post) => toHeroStory(post, locale))}
      />

      {desk === 'made-in-africa' && (
        <div className="insights-shell mb-12 grid gap-4 sm:grid-cols-2">
          <Link
            href={`/${locale}/consommer-local/cameroun`}
            className="rounded-lg border border-[#dfded7] bg-white px-6 py-5 font-semibold text-[#102f52] hover:border-[#e07520]"
          >
            {locale === 'fr' ? 'Consommer camerounais' : 'Buy Cameroonian'} ↗
          </Link>
          <Link
            href={`/${locale}/consommer-local/afrique`}
            className="rounded-lg border border-[#dfded7] bg-white px-6 py-5 font-semibold text-[#102f52] hover:border-[#e07520]"
          >
            {locale === 'fr' ? 'Consommer africain' : 'Buy African'} ↗
          </Link>
        </div>
      )}

      {(archivePosts.length > 0 || posts.length === 0) && (
        <section id="articles" className={styles.articles} aria-labelledby="desk-archive-title">
          <div className={'insights-shell ' + styles.archiveHeading}>
            <h2 id="desk-archive-title">
              {highlightedIds.size > 0
                ? fr
                  ? 'Les autres articles'
                  : 'More stories'
                : fr
                  ? 'Tous les articles'
                  : 'All articles'}
            </h2>
            {archivePosts.length > 0 && (
              <p>{fr ? 'Du plus récent au plus ancien' : 'Newest first'}</p>
            )}
          </div>
          {archivePosts.length > 0 ? (
            <CollectionArchive
              className={'insights-shell ' + styles.archive}
              locale={locale}
              placement="archive"
              posts={cards}
            />
          ) : (
            <div className="insights-shell">
              <p className="max-w-[62ch] text-[16px] leading-7 text-[#68727a]">
                {fr
                  ? 'Les premiers dossiers de cette rubrique sont en préparation.'
                  : 'The first stories for this section are in preparation.'}
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  )
}

export function localizedDeskMetadata(locale: SiteLocale, desk: EditorialRubricId): Metadata {
  const rubric = getEditorialRubric(desk)
  const path = localizedRubricPath(rubric, locale)

  return {
    title: rubric.title[locale],
    description: rubric.description[locale],
    alternates: {
      canonical: absoluteCanonicalURL(path),
      languages: {
        fr: absoluteCanonicalURL(localizedRubricPath(rubric, 'fr')),
        en: absoluteCanonicalURL(localizedRubricPath(rubric, 'en')),
        'x-default': absoluteCanonicalURL(localizedRubricPath(rubric, 'fr')),
      },
    },
  }
}
