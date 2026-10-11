import { describe, expect, it } from 'vitest'

import { getFaqItems, getKeyTakeaways } from '@/seo/answerContent'
import { buildArticleJsonLd, buildFaqJsonLd } from '@/seo/structuredData'
import type { Post } from '@/payload-types'

const basePost = {
  id: 1,
  title: 'QR CEMAC',
  excerpt: 'Ce que change le QR communautaire.',
  content: {
    root: { type: 'root', children: [], direction: 'ltr', format: '', indent: 0, version: 1 },
  },
  categories: [],
  authors: [],
  slug: 'qr-cemac',
  updatedAt: '2026-10-11T08:00:00.000Z',
  createdAt: '2026-10-10T08:00:00.000Z',
  _status: 'published',
} as unknown as Post

describe('answer content', () => {
  it('trims takeaways and drops empty rows', () => {
    expect(
      getKeyTakeaways({
        keyTakeaways: [{ text: '  Un   constat. ' }, { text: '' }],
      }),
    ).toEqual(['Un constat.'])
    expect(getKeyTakeaways({})).toEqual([])
  })

  it('keeps only complete FAQ pairs', () => {
    expect(
      getFaqItems({
        faq: [
          { question: 'Qui ?', answer: 'La BEAC.' },
          { question: 'Quand ?', answer: ' ' },
        ],
      }),
    ).toEqual([{ question: 'Qui ?', answer: 'La BEAC.' }])
  })

  it('builds FAQPage JSON-LD only when questions exist', () => {
    expect(buildFaqJsonLd({ locale: 'fr', post: { faq: [] }, slug: 'qr-cemac' })).toBeNull()

    expect(
      buildFaqJsonLd({
        locale: 'en',
        post: { faq: [{ question: 'Who runs it?', answer: 'GIMAC.' }] },
        slug: 'qr-cemac',
      }),
    ).toMatchObject({
      '@type': 'FAQPage',
      '@id': 'https://insight.trigenys.com/en/posts/qr-cemac#faq',
      inLanguage: 'en',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Who runs it?',
          acceptedAnswer: { '@type': 'Answer', text: 'GIMAC.' },
        },
      ],
    })
  })

  it('exposes takeaways as the article abstract', () => {
    const post = { ...basePost, keyTakeaways: [{ text: 'Premier.' }, { text: 'Second.' }] } as Post
    expect(buildArticleJsonLd({ locale: 'fr', post, slug: 'qr-cemac' })).toHaveProperty(
      'abstract',
      'Premier. Second.',
    )
    expect(
      buildArticleJsonLd({ locale: 'fr', post: basePost, slug: 'qr-cemac' }),
    ).not.toHaveProperty('abstract')
  })
})
