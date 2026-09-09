import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { slugField } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    {
      name: 'manifesto',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'color',
      type: 'text',
      defaultValue: '#E07520',
      admin: {
        description: 'Hex color used for category accents, for example #E07520.',
      },
    },
    slugField({
      position: undefined,
    }),
  ],
}
