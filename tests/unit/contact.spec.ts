import { describe, expect, it } from 'vitest'

import { parseContactRequest } from '@/utilities/contact'

describe('parseContactRequest', () => {
  it('normalizes a valid French editorial correction', () => {
    expect(
      parseContactRequest({
        email: '  READER@Example.com ',
        locale: 'fr',
        message: '  Une donnée publiée dans cet article semble incorrecte.  ',
        name: '  Marie N. ',
        sourceUrl: 'https://example.com/source',
        topic: 'correction',
        website: '',
      }),
    ).toEqual({
      email: 'reader@example.com',
      locale: 'fr',
      message: 'Une donnée publiée dans cet article semble incorrecte.',
      name: 'Marie N.',
      sourceUrl: 'https://example.com/source',
      topic: 'correction',
    })
  })

  it('accepts a request without a source URL', () => {
    expect(
      parseContactRequest({
        email: 'reader@example.com',
        locale: 'en',
        message: 'I have a story signal that may be worth investigating.',
        name: 'Alex Reader',
        topic: 'signal',
        website: '',
      }),
    ).toEqual({
      email: 'reader@example.com',
      locale: 'en',
      message: 'I have a story signal that may be worth investigating.',
      name: 'Alex Reader',
      sourceUrl: undefined,
      topic: 'signal',
    })
  })

  it.each([
    null,
    {},
    {
      email: 'not-an-email',
      locale: 'fr',
      message: 'Un message suffisamment long pour le formulaire.',
      name: 'Reader',
      topic: 'general',
    },
    {
      email: 'reader@example.com',
      locale: 'fr',
      message: 'Trop court',
      name: 'Reader',
      topic: 'general',
    },
    {
      email: 'reader@example.com',
      locale: 'fr',
      message: 'Un message suffisamment long pour le formulaire.',
      name: 'Reader',
      topic: 'unknown',
    },
    {
      email: 'reader@example.com',
      locale: 'fr',
      message: 'Un message suffisamment long pour le formulaire.',
      name: 'Reader',
      sourceUrl: 'javascript:alert(1)',
      topic: 'general',
    },
    {
      email: 'reader@example.com',
      locale: 'fr',
      message: 'Un message suffisamment long pour le formulaire.',
      name: 'Reader',
      topic: 'general',
      website: 'spam.example',
    },
  ])('rejects an invalid or automated request: %o', (request) => {
    expect(parseContactRequest(request)).toBeNull()
  })
})
