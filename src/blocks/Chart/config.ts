import type { Block } from 'payload'

export const Chart: Block = {
  slug: 'chart',
  interfaceName: 'EditorialChartBlock',
  labels: { singular: 'Graphique interactif', plural: 'Graphiques interactifs' },
  fields: [
    { name: 'title', type: 'text', localized: true, required: true },
    { name: 'description', type: 'textarea', localized: true, required: true, admin: { description: 'Résumé accessible du constat que montre le graphique.' } },
    { name: 'sourceLabel', type: 'text', localized: true, required: true },
    { name: 'sourceUrl', type: 'text', admin: { description: 'Lien public vers la source des données.' } },
    {
      name: 'metrics', type: 'array', minRows: 1, maxRows: 5, required: true,
      admin: { description: 'Une métrique par vue. Les lignes sont les périodes ou catégories comparées.' },
      fields: [
        { name: 'label', type: 'text', localized: true, required: true },
        { name: 'unit', type: 'text', localized: true, required: true },
        { name: 'precision', type: 'number', defaultValue: 1, min: 0, max: 2, required: true },
        {
          name: 'points', type: 'array', minRows: 2, maxRows: 12, required: true,
          fields: [
            { name: 'label', type: 'text', localized: true, required: true },
            { name: 'value', type: 'number', required: true },
          ],
        },
      ],
    },
  ],
}
