import { describe, expect, it } from 'vitest'
import { cardCategoryLinks } from '@/components/Card/categoryLinks'

describe('public card category labels', () => {
  it.each(['fr', 'en'] as const)('merges legacy aliases into one section link in %s', (locale) => {
    const categories = [
      { slug: 'technology', title: 'Technology' },
      { slug: 'tech-ai', title: 'Tech & IA' },
      { slug: 'information-systems', title: 'Information Systems' },
      { slug: 'society-future', title: 'Society' },
      { slug: 'africa', title: 'Africa' },
    ]
    const links = cardCategoryLinks(categories, locale)
    expect(links.map((link) => link.href)).toEqual([
      `/${locale}/${locale === 'fr' ? 'tech-ia' : 'tech-ai'}`,
      `/${locale}/${locale === 'fr' ? 'societe-avenir' : 'society-future'}`,
    ])
    expect(links.map((link) => link.label)).toEqual(
      locale === 'fr' ? ['Tech & IA', 'Société & Avenir'] : ['Tech & AI', 'Society & the Future'],
    )
    expect(categories).toHaveLength(5)
  })

  it('keeps distinct sections in editorial order and skips unresolved relations', () => {
    expect(
      cardCategoryLinks(
        [
          42,
          { slug: 'business-finance', title: 'Finance' },
          { slug: 'business', title: 'Business' },
          { slug: 'custom-topic', title: 'Custom topic' },
          { title: 'Field notes' },
          { title: 'Field notes' },
        ],
        'en',
      ).map(({ href, label }) => ({ href, label })),
    ).toEqual([
      { href: '/en/business-finance', label: 'Business & Money' },
      { href: '/en/custom-topic', label: 'Custom topic' },
      { href: null, label: 'Field notes' },
    ])
    expect(cardCategoryLinks(null, 'fr')).toEqual([])
  })

  it('groups local-consumption aliases under their canonical African products section', () => {
    expect(
      cardCategoryLinks(
        [
          { slug: 'consommer-camerounais' },
          { slug: 'made-in-africa' },
          { slug: 'consommer-africain' },
        ],
        'fr',
      ).map(({ href, label }) => ({ href, label })),
    ).toEqual([{ href: '/fr/made-in-africa', label: 'Made in Africa' }])
  })
})
