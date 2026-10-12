import type { Block } from 'payload'

/**
 * Research-validated named dataset only. Money-flow paths are maintained in
 * version-controlled sources and reviewed before allowing a new preset.
 * The Lexical block stays within the post's existing JSONB content column.
 */
export const MoneyFlow: Block = {
  slug: 'moneyFlow',
  interfaceName: 'MoneyFlowBlock',
  labels: {
    singular: 'Explorateur de paiements',
    plural: 'Explorateurs de paiements',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
      admin: { description: 'Question ou titre clair, visible au lecteur.' },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      required: true,
      admin: { description: 'Expliquez les limites du graphique sans promettre de tarifs ou de services non vérifiés.' },
    },
    {
      name: 'dataset',
      type: 'select',
      required: true,
      defaultValue: 'cameroon-payments-oct-2026',
      options: [
        { label: 'Cameroun — parcours des paiements (sources octobre 2026)', value: 'cameroon-payments-oct-2026' },
      ],
      admin: { description: 'Jeu de parcours et de liens sourcés géré dans le code ; pas de chiffres inventés par l’éditeur.' },
    },
  ],
}
