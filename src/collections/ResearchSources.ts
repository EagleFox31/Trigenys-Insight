import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const ResearchSources: CollectionConfig = {
  slug: 'research-sources',
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['title', 'publisher', 'publishedAt', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'publisher', type: 'text' },
    { name: 'url', type: 'text', required: true, unique: true },
    { name: 'publishedAt', type: 'date' },
    { name: 'accessedAt', type: 'date', required: true, index: true },
    {
      name: 'language',
      type: 'select',
      defaultValue: 'fr',
      options: [
        { label: 'Français', value: 'fr' },
        { label: 'English', value: 'en' },
        { label: 'Other', value: 'other' },
      ],
    },
    { name: 'notes', type: 'textarea' },
  ],
  timestamps: true,
}
