import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { CollectionArchive } from '@/components/CollectionArchive'
import type { CardPostData } from '@/components/Card'
import type { SiteLocale } from '@/i18n/config'
import { absoluteCanonicalURL, buildBreadcrumbJsonLd, serializeJsonLd } from '@/seo/structuredData'

export type ConsumptionScope = 'cameroun' | 'afrique'

const series = {
  cameroun: {
    slug: 'consommer-camerounais',
    fr: { title: 'Consommer camerounais', description: 'Produits, services et marques du Cameroun : prix, disponibilité, qualité et service après-vente examinés concrètement.' },
    en: { title: 'Buy Cameroonian', description: 'Cameroonian products, services and brands, assessed through price, availability, quality and after-sales support.' },
  },
  afrique: {
    slug: 'consommer-africain',
    fr: { title: 'Consommer africain', description: 'Des offres venues du continent, avec les coûts de livraison, les moyens de paiement et les conditions d’achat à vérifier.' },
    en: { title: 'Buy African', description: 'Products and services from across Africa, with shipping costs, payment options and purchase terms clearly examined.' },
  },
} as const

const landing = {
  fr: {
    title: 'Consommer local',
    description: 'Où acheter, à quel prix et avec quelles garanties ? Des repères pour choisir des produits et services camerounais et africains.',
    eyebrow: 'Guide d’achat · Cameroun et Afrique',
    method: 'Chaque enquête précise la date des prix, les lieux d’achat vérifiés et les limites de la comparaison. Une collaboration commerciale est signalée clairement.',
    empty: 'Les premiers guides sont en préparation. Revenez bientôt pour des comparatifs sourcés.',
    recent: 'Les dernières enquêtes',
  },
  en: {
    title: 'Buy local',
    description: 'Where to buy, at what price and with what guarantees? Practical guidance for choosing Cameroonian and African products and services.',
    eyebrow: 'Buying guides · Cameroon and Africa',
    method: 'Each guide states when prices were checked, where products were available and what the comparison cannot establish. Commercial partnerships are clearly disclosed.',
    empty: 'The first guides are in preparation. Check back soon for sourced comparisons.',
    recent: 'Latest guides',
  },
} as const

export async function LocalConsumptionPage({ locale, scope }: { locale: SiteLocale; scope?: ConsumptionScope }) {
  const payload = await getPayload({ config: configPromise })
  const copy = scope ? series[scope][locale] : landing[locale]
  const path = `/${locale}/consommer-local${scope ? `/${scope}` : ''}`
  const categories = await payload.find({
    collection: 'categories', depth: 0, fallbackLocale: false, locale, limit: 2,
    pagination: false, overrideAccess: false,
    where: { slug: { in: scope ? [series[scope].slug] : Object.values(series).map((item) => item.slug) } },
  })
  const categoryIds = categories.docs.map((item) => item.id)
  let posts: CardPostData[] = []

  if (categoryIds.length) {
    const result = await payload.find({
      collection: 'posts', depth: 1, fallbackLocale: false, locale, limit: 24,
      pagination: false, overrideAccess: false, sort: '-publishedAt',
      where: { and: [
        { _status: { equals: 'published' } },
        { categories: { in: categoryIds } },
      ] },
      select: { title: true, slug: true, categories: true, meta: true },
    })
    posts = result.docs.filter((post) => Boolean(post.title))
  }

  const breadcrumbs = [
    { name: locale === 'fr' ? 'Accueil' : 'Home', path: `/${locale}` },
    { name: landing[locale].title, path: `/${locale}/consommer-local` },
    ...(scope ? [{ name: copy.title, path }] : []),
  ]

  return (
    <main className="py-16 md:py-24">
      <script dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildBreadcrumbJsonLd(breadcrumbs)) }} type="application/ld+json" />
      <div className="insights-shell mb-12 border-b border-[#dfded7] pb-10">
        <p className="eyebrow">{landing[locale].eyebrow}</p>
        <h1 className="mt-4 font-[var(--font-fraunces)] text-[clamp(3rem,7vw,6.2rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#102f52]">{copy.title}</h1>
        <p className="mt-7 max-w-[66ch] text-lg leading-8 text-[#59636b]">{copy.description}</p>
        {scope && <Link className="mt-7 inline-block font-semibold text-[#b85d14] underline" href={`/${locale}/consommer-local`}>{locale === 'fr' ? 'Voir toute la rubrique' : 'Explore the full section'} →</Link>}
      </div>
      {!scope && (
        <div className="insights-shell mb-14 grid gap-5 md:grid-cols-2">
          {(Object.keys(series) as ConsumptionScope[]).map((item) => (
            <Link className="group rounded-md border border-[#dfded7] bg-[#fafaf7] p-7 transition-colors hover:border-[#e07520]" href={`/${locale}/consommer-local/${item}`} key={item}>
              <p className="eyebrow">{item === 'cameroun' ? '01 · Cameroun' : '02 · Afrique'}</p>
              <h2 className="mt-4 font-[var(--font-fraunces)] text-3xl font-semibold text-[#102f52] group-hover:text-[#b85d14]">{series[item][locale].title} →</h2>
              <p className="mt-3 leading-7 text-[#59636b]">{series[item][locale].description}</p>
            </Link>
          ))}
        </div>
      )}
      <div className="insights-shell mb-9">
        <h2 className="font-[var(--font-fraunces)] text-3xl font-semibold text-[#102f52]">{scope ? copy.title : landing[locale].recent}</h2>
      </div>
      {posts.length ? <CollectionArchive locale={locale} placement="archive" posts={posts} /> : <p className="insights-shell max-w-[68ch] leading-7 text-[#68727a]">{landing[locale].empty}</p>}
      <div className="insights-shell mt-16 border-t border-[#dfded7] pt-7 text-sm leading-7 text-[#59636b]">{landing[locale].method}</div>
    </main>
  )
}

export function localConsumptionMetadata(locale: SiteLocale, scope?: ConsumptionScope): Metadata {
  const path = `/consommer-local${scope ? `/${scope}` : ''}`
  const copy = scope ? series[scope][locale] : landing[locale]
  return {
    title: copy.title, description: copy.description,
    alternates: { canonical: absoluteCanonicalURL(`/${locale}${path}`), languages: {
      fr: absoluteCanonicalURL(`/fr${path}`), en: absoluteCanonicalURL(`/en${path}`),
      'x-default': absoluteCanonicalURL(`/fr${path}`),
    } },
  }
}

export function parseConsumptionScope(scope: string): ConsumptionScope {
  if (scope !== 'cameroun' && scope !== 'afrique') notFound()
  return scope
}
