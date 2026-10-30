import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { slugField } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: authenticated,
    // Never physically delete historical IDs. Use reviewed retirement instead.
    delete: () => false,
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
    {
      name: 'retiredAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'A reversible legacy retirement flag. Retire/restore through the guarded editorial workflow; historical relations remain valid.',
      },
    },
    slugField({
      position: undefined,
    }),
  ],
}
