import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletter-subscribers',
  access: {
    create: () => false,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['email', 'locale', 'status', 'consentedAt'],
    useAsTitle: 'email',
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
    {
      name: 'locale',
      type: 'select',
      defaultValue: 'fr',
      options: [
        { label: 'Français', value: 'fr' },
        { label: 'English', value: 'en' },
      ],
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
      ],
      required: true,
      index: true,
    },
    { name: 'consentedAt', type: 'date', required: true },
  ],
  timestamps: true,
}
