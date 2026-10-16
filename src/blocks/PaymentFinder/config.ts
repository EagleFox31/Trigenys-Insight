import type { Block } from 'payload'

/** Standalone editorial component; its version-controlled dataset does not
 * require a schema migration or store unreviewed provider claims in posts. */
export const PaymentFinderBlockConfig: Block = {
  slug: 'paymentFinder',
  labels: { singular: 'Comparateur de paiements', plural: 'Comparateurs de paiements' },
  fields: [
    { name:'dataset', type:'select', required:true, defaultValue:'cameroon-oct-2026',
      options:[{label:'Cameroun — 63 pistes (octobre 2026)',value:'cameroon-oct-2026'}],
      admin:{description:'Comparateur interactif, sources, limites et calculateur de frais. Aucun appel aux API des fournisseurs.'},
    },
  ],
}
