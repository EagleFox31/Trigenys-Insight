import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

function validateProfileURL(value: unknown) {
  if (typeof value !== 'string' || !value) return true
  try {
    return new URL(value).protocol === 'https:' || 'Use a full https:// URL.'
  } catch {
    return 'Use a full https:// URL.'
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      // Only these fields are read for the public author page and its
      // Person/ProfilePage structured data. Everything else stays private.
      type: 'collapsible',
      label: 'Profil public d’auteur',
      admin: {
        description:
          'Affiché sur la page auteur et transmis aux moteurs de recherche et de réponse IA.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'jobTitle',
          type: 'text',
          label: 'Fonction',
          localized: true,
          maxLength: 120,
        },
        {
          name: 'bio',
          type: 'textarea',
          label: 'Biographie courte',
          localized: true,
          maxLength: 600,
        },
        {
          name: 'expertise',
          type: 'text',
          label: 'Domaines d’expertise',
          hasMany: true,
          localized: true,
          maxRows: 8,
        },
        {
          name: 'profileLinks',
          type: 'array',
          label: 'Profils publics',
          labels: { singular: 'Profil', plural: 'Profils' },
          maxRows: 6,
          fields: [
            {
              name: 'url',
              type: 'text',
              required: true,
              validate: validateProfileURL,
            },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
