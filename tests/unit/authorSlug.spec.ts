import { describe, expect, it } from 'vitest'

import { authorSlug } from '@/utilities/authorSlug'

describe('authorSlug', () => {
  it('creates stable URL-safe slugs for public author names', () => {
    expect(authorSlug("Jennifer Lawrynn Aka'a")).toBe('jennifer-lawrynn-aka-a')
    expect(authorSlug('Éric Njoya')).toBe('eric-njoya')
  })

  it('collapses whitespace and punctuation', () => {
    expect(authorSlug('  Trigenys   Editorial  ')).toBe('trigenys-editorial')
  })
})
