import type { SiteLocale } from '@/i18n/config'

/**
 * Canonical editorial sections (FR and EN) and their legacy CMS categories.
 * Legacy categories are read-only aliases until an editor runs the optional
 * authenticated Payload setup. Existing post relationships are never rewritten
 * as a side effect of a frontend deployment.
 */
export const editorialRubrics = [
  {
    id: 'tech-ai',
    paths: { fr: 'tech-ia', en: 'tech-ai' },
    title: { fr: 'Tech & IA', en: 'Tech & AI' },
    description: {
      fr: 'Intelligence artificielle, cybersécurité, logiciels, cloud, smartphones et innovations qui changent notre quotidien.',
      en: 'AI, cybersecurity, software, cloud, devices and innovations changing everyday life across Africa and the world.',
    },
    color: '#E07520',
    legacySlugs: ['technology', 'information-systems'],
  },
  {
    id: 'gaming-culture',
    paths: { fr: 'gaming-culture', en: 'gaming-culture' },
    title: { fr: 'Gaming & Culture', en: 'Gaming & Digital Culture' },
    description: {
      fr: 'Jeux vidéo, e-sport, streaming, cinéma, créateurs et phénomènes de la culture numérique.',
      en: 'Gaming, esports, streaming, film, creators and the digital culture shaping African audiences.',
    },
    color: '#7656A8',
    legacySlugs: [],
  },
  {
    id: 'business-finance',
    paths: { fr: 'business-finance', en: 'business-finance' },
    title: { fr: 'Business & Finance', en: 'Business & Money' },
    description: {
      fr: 'Entreprises, fintech, mobile money, paiements, investissements et économie expliqués concrètement.',
      en: 'Business, fintech, digital payments, personal finance, investing and African entrepreneurship.',
    },
    color: '#15355A',
    legacySlugs: ['business'],
  },
  {
    id: 'education-careers',
    paths: { fr: 'etudes-carrieres', en: 'education-careers' },
    title: { fr: 'Études & Carrières', en: 'Education & Careers' },
    description: {
      fr: 'Bourses, Campus France, études IT, universités, certifications et carrières au Cameroun et ailleurs.',
      en: 'Scholarships, university pathways, IT degrees, certifications and tech careers in Africa and beyond.',
    },
    color: '#1E827B',
    legacySlugs: [],
  },
  {
    id: 'made-in-africa',
    paths: { fr: 'made-in-africa', en: 'built-in-africa' },
    title: { fr: 'Made in Africa', en: 'Built in Africa' },
    description: {
      fr: 'Startups, applications, marques, services et produits africains : enquêtes, tests, prix et comparatifs.',
      en: 'African-built apps, startups, brands, products and services: independent testing and meaningful comparisons.',
    },
    color: '#5E7A3A',
    legacySlugs: ['consommer-camerounais', 'consommer-africain'],
  },
  {
    id: 'society-future',
    paths: { fr: 'societe-avenir', en: 'society-future' },
    title: { fr: 'Société & Avenir', en: 'Society & the Future' },
    description: {
      fr: 'Emploi, éducation, infrastructures, services publics et transformations sociales en Afrique et dans le monde.',
      en: 'Jobs, education, infrastructure, public services and the forces changing societies worldwide.',
    },
    color: '#2C5F7A',
    legacySlugs: ['africa'],
  },
] as const

export type EditorialRubric = (typeof editorialRubrics)[number]
export type EditorialRubricId = EditorialRubric['id']

export function getEditorialRubric(id: EditorialRubricId): EditorialRubric {
  const rubric = editorialRubrics.find((item) => item.id === id)
  if (!rubric) throw new Error(`Unknown editorial rubric: ${id}`)
  return rubric
}

export function localizedRubricPath(rubric: EditorialRubric, locale: SiteLocale) {
  return `/${locale}/${rubric.paths[locale]}`
}

export function sectionForCategorySlug(slug?: string | null) {
  return editorialRubrics.find(
    (rubric) =>
      rubric.id === slug || rubric.legacySlugs.some((legacySlug) => legacySlug === slug),
  )
}

export function rubricMatchesCategory(id: EditorialRubricId, slug?: string | null): boolean {
  const rubric = getEditorialRubric(id)
  return rubric.id === slug || rubric.legacySlugs.some((legacySlug) => legacySlug === slug)
}

export function localizedSectionSwitchPath(pathname: string, target: SiteLocale) {
  const segment = pathname.split('/').filter(Boolean)[1]
  const rubric = editorialRubrics.find(
    (item) => item.paths.fr === segment || item.paths.en === segment,
  )
  return rubric ? localizedRubricPath(rubric, target) : null
}

/**
 * An explicit canonical category supersedes legacy aliases. Without one, older
 * posts remain discoverable via legacy categories until reviewed in Payload.
 */
export function postBelongsToRubric(id: EditorialRubricId, slugs: readonly string[]) {
  const canonical = editorialRubrics.find((rubric) => slugs.includes(rubric.id))
  if (canonical) return canonical.id === id
  return slugs.some((slug) => rubricMatchesCategory(id, slug))
}
