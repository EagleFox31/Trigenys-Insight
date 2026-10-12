import { editorialRubrics, type EditorialRubricId } from '@/editorial/rubrics'

/**
 * Human-reviewed assignment for the inventory observed on 12 October 2026.
 * Never derive editorial classification from keywords: this file is intentionally
 * explicit, reviewable and versioned. Unlisted posts are skipped.
 */
export const curatedPostRubrics: Record<string, EditorialRubricId> = {
  'pipeline-ia-multi-agents-quatre-heures': 'tech-ai',
  '42-milliards-fcfa-data-center-ia-douala-cameroun': 'tech-ai',
  'cemac-qr-code-interoperable-paiements-adoption': 'business-finance',
  'cameroun-systemes-publics-interoperabilite-architecture': 'society-future',
  'afrique-financement-startups-2026-reprise-inegale': 'business-finance',
  'nous-apprenons-ia-a-envers': 'tech-ai',
  'fc-27-prix-performances-et-achat-avant-la-sortie': 'gaming-culture',
  'whisp-wetransfer-swisstransfer-cameroun': 'made-in-africa',
  'cfao-mobility-cameroun-ventes-benefice-marge-2026': 'business-finance',
  'freellmapi-claude-code-free-tiers-llm-router': 'tech-ai',
  'cloudflare-containers-isolation-multi-tenant-faille': 'tech-ai',
  'dangote-lamu-raffinerie-kenya-ecosysteme': 'business-finance',
  'kempinski-douala-220-milliards-opportunites-ecosysteme': 'business-finance',
  'internet-cameroun-ou-partent-nos-donnees': 'tech-ai',
  'ia-afrique-peut-elle-vraiment-decider': 'society-future',
  'nvidia-vraie-force-pas-seulement-puces-cuda': 'tech-ai',
  'stablecoins-franc-cfa-menace-cemac': 'business-finance',
  'cits-2026-cameroun-tech-africaine': 'tech-ai',
  'transfert-argent-cameroun-afrique-europe-monde': 'business-finance',
  'driivio-cameroun-code-permis-conduire-prix': 'made-in-africa',
  'morena-ia-langues-africaines-cameroun': 'tech-ai',
}

export type CategoryReference = { id: number; slug: string }

export function orderedCategoryIds(
  current: CategoryReference[],
  newPrimary: CategoryReference,
): number[] {
  return [newPrimary.id, ...current.filter((c) => c.id !== newPrimary.id).map((c) => c.id)]
}

export function classificationForSlug(slug: string) {
  const id = curatedPostRubrics[slug]
  if (!id) return null
  return editorialRubrics.find((item) => item.id === id) ?? null
}

export function classifyExistingPost(
  slug: string,
  current: CategoryReference[],
  categoriesBySlug: Map<string, CategoryReference>,
) {
  const rubric = classificationForSlug(slug)
  if (!rubric) return { status: 'unlisted' as const }
  const primary = categoriesBySlug.get(rubric.id)
  if (!primary) return { status: 'missing-category' as const, rubric }
  const all = orderedCategoryIds(current, primary)
  if (current.map((c) => c.id).join(',') === all.join(',')) {
    return { status: 'unchanged' as const, rubric, categories: all }
  }
  return { status: 'change' as const, rubric, categories: all }
}
