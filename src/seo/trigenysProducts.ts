import type { SiteLocale } from '@/i18n/config'

export type TrigenysProduct = {
  id: string
  name: string
  url: string
  pitch: Record<SiteLocale, string>
  /** Lower-case fragments matched against the article title, excerpt and categories. */
  keywords: readonly string[]
}

/**
 * Trigenys products as listed on www.trigenys.com (#produits). Declarative:
 * adding a product or a keyword is a data change, not a code change. A
 * product is only suggested when the article topic matches one of its
 * keywords, never by default.
 */
export const TRIGENYS_PRODUCTS: readonly TrigenysProduct[] = [
  {
    id: 'atelier-maitre',
    name: 'Atelier Maître',
    url: 'https://atelier.trigenys.com/',
    pitch: {
      fr: 'Le logiciel de gestion d’atelier automobile de Trigenys : réception, ordres de travail, stock, devis et factures.',
      en: 'Trigenys garage management software: vehicle intake, work orders, parts stock, quotes and invoices.',
    },
    keywords: ['garage', 'atelier auto', 'automobile', 'mécanicien', 'car repair', 'workshop', 'auto repair'],
  },
  {
    id: 'commerce-factory',
    name: 'Trigenys Commerce Factory',
    url: 'https://trigenys-commerce-factory.pages.dev/',
    pitch: {
      fr: 'Créez votre boutique en ligne et suivez commandes, ventes et stocks au même endroit (bêta ouverte).',
      en: 'Create your online store and track orders, sales and stock in one place (open beta).',
    },
    keywords: ['e-commerce', 'ecommerce', 'boutique en ligne', 'commerce en ligne', 'online store', 'vente en ligne', 'online shop'],
  },
  {
    id: 'precis-translator',
    name: 'Précis Translator',
    url: 'https://precis-translator.trigenys.com/',
    pitch: {
      fr: 'Traduisez PDF, Word, PowerPoint et Excel du français vers l’anglais en conservant la mise en page.',
      en: 'Translate PDF, Word, PowerPoint and Excel files between French and English while keeping the layout.',
    },
    keywords: ['traduction', 'traduire', 'translation', 'translate', 'traducteur', 'translator'],
  },
]

/** First product whose keywords match the article topic, or null. */
export function matchTrigenysProduct(
  topic: { title?: string | null; excerpt?: string | null; categories?: readonly (string | null | undefined)[] },
  products: readonly TrigenysProduct[] = TRIGENYS_PRODUCTS,
): TrigenysProduct | null {
  const haystack = [topic.title, topic.excerpt, ...(topic.categories || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (!haystack) return null

  return products.find((product) => product.keywords.some((keyword) => haystack.includes(keyword))) || null
}
