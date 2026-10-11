import { describe, expect, it } from 'vitest'

import { buildLlmsFullTxt, buildLlmsTxt, lexicalToPlainText, type LlmsPost } from '@/seo/llms'

function text(value: string) {
  return { type: 'text', text: value }
}

const content = {
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [text('Le QR communautaire'), { type: 'linebreak' }, text('est lancé.')],
      },
      { type: 'heading', tag: 'h2', children: [text('Pourquoi  c’est important')] },
      {
        type: 'list',
        listType: 'number',
        children: [
          { type: 'listitem', children: [text('Interopérabilité')] },
          {
            type: 'listitem',
            children: [
              text('Tarifs'),
              {
                type: 'list',
                listType: 'bullet',
                children: [{ type: 'listitem', children: [text('Commerçants')] }],
              },
            ],
          },
        ],
      },
      { type: 'quote', children: [text('Il scanne. Il paie.')] },
      { type: 'block', fields: { blockType: 'chart' } },
      { type: 'paragraph', children: [{ type: 'link', children: [text('BEAC')] }] },
    ],
  },
}

function post(overrides: Partial<LlmsPost> = {}): LlmsPost {
  return {
    title: 'QR CEMAC',
    slug: 'qr-cemac',
    excerpt: 'Ce que change le QR communautaire.',
    content,
    publishedAt: '2026-10-10T08:00:00.000Z',
    updatedAt: '2026-10-11T08:00:00.000Z',
    ...overrides,
  }
}

describe('lexicalToPlainText', () => {
  it('renders headings, lists, quotes and links as light Markdown and skips blocks', () => {
    expect(lexicalToPlainText(content)).toBe(
      [
        'Le QR communautaire est lancé.',
        '## Pourquoi c’est important',
        '1. Interopérabilité\n2. Tarifs\n  - Commerçants',
        '> Il scanne. Il paie.',
        'BEAC',
      ].join('\n\n'),
    )
  })

  it('returns an empty string for missing content', () => {
    expect(lexicalToPlainText(null)).toBe('')
  })
})

describe('buildLlmsTxt', () => {
  it('keeps the canonical guide and lists only routable posts, newest first', () => {
    const output = buildLlmsTxt({
      fr: [
        post({ slug: 'ancien', title: 'Ancien', publishedAt: '2026-09-01T00:00:00.000Z' }),
        post(),
        post({ slug: 'sans-resume', excerpt: '' }),
      ],
      en: [post({ slug: 'qr-cemac-en', title: 'CEMAC QR', excerpt: 'What changes.' })],
    })

    expect(output).toContain('Canonical site: https://insight.trigenys.com')
    expect(output).toContain('https://insight.trigenys.com/llms-full.txt')
    expect(output).toContain('https://insight.trigenys.com/news-sitemap.xml')
    expect(output).toContain('## Latest analysis (French)')
    expect(output).toContain(
      '- [QR CEMAC](https://insight.trigenys.com/fr/posts/qr-cemac): Ce que change le QR communautaire.',
    )
    expect(output.indexOf('/fr/posts/qr-cemac')).toBeLessThan(output.indexOf('/fr/posts/ancien'))
    expect(output).toContain('https://insight.trigenys.com/en/posts/qr-cemac-en')
    expect(output).not.toContain('sans-resume')
    expect(output).not.toContain('vercel.app')
    expect(output).not.toContain('/admin')
  })

  it('omits a language section when it has no article', () => {
    const output = buildLlmsTxt({ fr: [], en: [post()] })
    expect(output).not.toContain('Latest analysis (French)')
    expect(output).toContain('Latest analysis (English)')
  })
})

describe('buildLlmsFullTxt', () => {
  it('includes canonical URL, metadata, body and public sources', () => {
    const output = buildLlmsFullTxt({
      fr: [
        post({
          categories: [{ title: 'Afrique' }, 3],
          sources: [
            {
              title: 'Rapport BEAC',
              publisher: 'BEAC',
              url: 'https://www.beac.int/r',
              notes: 'privé',
            },
            { title: 'Sans URL', url: 'ftp://x' },
            5,
          ],
        }),
      ],
      en: [],
    })

    expect(output).toContain('# QR CEMAC')
    expect(output).toContain('URL: https://insight.trigenys.com/fr/posts/qr-cemac')
    expect(output).toContain('Published: 2026-10-10')
    expect(output).toContain('Desk: Afrique')
    expect(output).toContain('## Pourquoi c’est important')
    expect(output).toContain('- Rapport BEAC — BEAC — https://www.beac.int/r')
    expect(output).not.toContain('Sans URL')
    expect(output).not.toContain('privé')
  })

  it('stays within the character budget', () => {
    const posts = Array.from({ length: 20 }, (_, index) =>
      post({ slug: `post-${index}`, publishedAt: `2026-10-${String(index + 1).padStart(2, '0')}` }),
    )
    const output = buildLlmsFullTxt({ fr: posts, en: [] }, 1500)

    expect(output.length).toBeLessThanOrEqual(1501)
    expect(output).toContain('/fr/posts/post-19')
    expect(output).not.toContain('/fr/posts/post-0\n')
  })
})
