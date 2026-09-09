import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { authenticated } from '../access/authenticated'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'
import { defaultLexical } from '../fields/defaultLexical'

export const Reports: CollectionConfig = {
  slug: 'reports',
  indexes: [{ fields: ['_status', 'reportDate'] }],
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['title', 'accessLevel', 'reportDate', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    { name: 'title', type: 'text', localized: true, required: true },
    { name: 'summary', type: 'textarea', localized: true, required: true },
    { name: 'reportDate', type: 'date', required: true },
    {
      name: 'accessLevel',
      type: 'select',
      defaultValue: 'free',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Premium', value: 'premium' },
      ],
      required: true,
    },
    { name: 'methodology', type: 'richText', editor: defaultLexical, localized: true },
    {
      name: 'sources',
      type: 'relationship',
      hasMany: true,
      relationTo: 'research-sources',
    },
    {
      name: 'authors',
      type: 'relationship',
      hasMany: true,
      relationTo: 'users',
      required: true,
    },
    { name: 'relatedPosts', type: 'relationship', hasMany: true, relationTo: 'posts' },
    slugField(),
  ],
  versions: {
    drafts: { autosave: true, schedulePublish: true },
    maxPerDoc: 30,
  },
}
