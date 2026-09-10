import { describe, expect, it } from 'vitest'

import { parseNewsletterRequest } from '@/utilities/newsletter'

describe('parseNewsletterRequest', () => {
  it('normalizes a valid email address', () => {
    expect(parseNewsletterRequest({ email: '  EDITOR@Trigenys.com  ', website: '' })).toEqual({
      email: 'editor@trigenys.com',
    })
  })

  it.each([
    null,
    {},
    { email: 'not-an-email' },
    { email: 'reader@trigenys.com', website: 'spam.example' },
  ])('rejects an invalid or automated request: %o', (request: unknown) => {
    expect(parseNewsletterRequest(request)).toBeNull()
  })
})
