import { describe, expect, it } from 'vitest'

import {
  parseNewsletterRequest,
  shouldTrackNewsletterSubscriptionSuccess,
} from '@/utilities/newsletter'

describe('parseNewsletterRequest', () => {
  it('normalizes a valid French subscription', () => {
    expect(
      parseNewsletterRequest({
        email: '  EDITOR@Trigenys.com  ',
        locale: 'fr',
        website: '',
      }),
    ).toEqual({
      email: 'editor@trigenys.com',
      locale: 'fr',
    })
  })

  it('preserves the English locale', () => {
    expect(
      parseNewsletterRequest({
        email: 'reader@trigenys.com',
        locale: 'en',
        website: '',
      }),
    ).toEqual({
      email: 'reader@trigenys.com',
      locale: 'en',
    })
  })

  it('falls back to French for an unsupported locale', () => {
    expect(
      parseNewsletterRequest({
        email: 'reader@trigenys.com',
        locale: 'de',
        website: '',
      }),
    ).toEqual({
      email: 'reader@trigenys.com',
      locale: 'fr',
    })
  })

  it.each([
    null,
    {},
    { email: 'not-an-email' },
    { email: 'reader@trigenys.com', website: 'spam.example' },
  ])('rejects an invalid or automated request: %o', (request) => {
    expect(parseNewsletterRequest(request)).toBeNull()
  })
})

describe('newsletter conversion semantics', () => {
  it('counts created and reactivated subscriptions as conversions', () => {
    expect(shouldTrackNewsletterSubscriptionSuccess('created')).toBe(true)
    expect(shouldTrackNewsletterSubscriptionSuccess('reactivated')).toBe(true)
  })

  it('does not count an already-active subscriber as a new conversion', () => {
    expect(shouldTrackNewsletterSubscriptionSuccess('existing')).toBe(false)
  })
})
