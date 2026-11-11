import type { SiteLocale } from '@/i18n/config'

/**
 * Single editorial positioning, per locale. Every public surface that
 * describes the publication (home H1, meta description, og:description,
 * llms.txt, Organization JSON-LD) reads from here so the wording never drifts.
 */
export const SITE_POSITIONING: Record<SiteLocale, { headline: string; description: string }> = {
  fr: {
    headline: 'Analyses sourcées sur l’IA, la tech, la finance et l’innovation en Afrique',
    description:
      'Trigenys Insights publie depuis Douala des analyses sourcées et bilingues sur l’IA, la tech, le gaming, la finance, les études, les carrières et l’innovation africaine, pour mieux décider.',
  },
  en: {
    headline: 'Sourced analysis on AI, technology, finance and innovation in Africa',
    description:
      'Trigenys Insights publishes sourced, bilingual analysis from Douala on AI, technology, gaming, finance, education, careers and African innovation, to support better decisions.',
  },
}

export function sitePositioning(locale: SiteLocale) {
  return SITE_POSITIONING[locale]
}
