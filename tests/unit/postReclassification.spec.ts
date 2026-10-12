import { describe, expect, it } from 'vitest'
import {
  classifyExistingPost,
  classificationForSlug,
  curatedPostRubrics,
  orderedCategoryIds,
} from '@/editorial/postReclassification'

describe('Curated legacy-safe editorial post reclassification', () => {
  it('has one reviewed canonical primary section for every inventoried article', () => {
    expect(Object.keys(curatedPostRubrics)).toHaveLength(21)
    expect(classificationForSlug('fc-27-prix-performances-et-achat-avant-la-sortie')?.id).toBe('gaming-culture')
    expect(classificationForSlug('whisp-wetransfer-swisstransfer-cameroun')?.id).toBe('made-in-africa')
    expect(classificationForSlug('driivio-cameroun-code-permis-conduire-prix')?.id).toBe('made-in-africa')
    expect(classificationForSlug('transfert-argent-cameroun-afrique-europe-monde')?.id).toBe('business-finance')
    expect(classificationForSlug('unknown-future-article')).toBeNull()
  })

  it('prepends new primary without dropping or duplicating legacy references', () => {
    expect(orderedCategoryIds([{ id: 1, slug: 'technology' }, { id: 2, slug: 'business' }], { id: 8, slug: 'gaming-culture' }))
      .toEqual([8, 1, 2])
    expect(orderedCategoryIds([{ id: 8, slug: 'gaming-culture' }, { id: 1, slug: 'technology' }], { id: 8, slug: 'gaming-culture' }))
      .toEqual([8, 1])
  })

  it('requires new category installation and is idempotent', () => {
    const original = [{ id: 1, slug: 'technology' }, { id: 2, slug: 'business' }]
    const missing = classifyExistingPost('fc-27-prix-performances-et-achat-avant-la-sortie', original, new Map())
    expect(missing.status).toBe('missing-category')
    const known = new Map([['gaming-culture', { id: 8, slug: 'gaming-culture' }]])
    const planned = classifyExistingPost('fc-27-prix-performances-et-achat-avant-la-sortie', original, known)
    expect(planned).toMatchObject({ status: 'change', categories: [8, 1, 2] })
    const second = classifyExistingPost(
      'fc-27-prix-performances-et-achat-avant-la-sortie',
      [{ id: 8, slug: 'gaming-culture' }, ...original], known,
    )
    expect(second).toMatchObject({ status: 'unchanged', categories: [8, 1, 2] })
  })
})
