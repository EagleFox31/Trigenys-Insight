import type { CollectionSlug, GlobalSlug, Payload, PayloadRequest } from 'payload'

import type { Post } from '@/payload-types'
import { founderDraftMetadata, founderDraftSource } from './trigenys-founder-draft'

const collections: CollectionSlug[] = [
  'categories',
  'media',
  'newsletter-subscribers',
  'pages',
  'posts',
  'reports',
  'research-sources',
  'forms',
  'form-submissions',
  'search',
]

const globals: GlobalSlug[] = ['header', 'footer']

const categories = [
  {
    color: '#E07520',
    manifesto:
      'Technologie, intelligence artificielle et cybersécurité analysées depuis les réalités africaines.',
    slug: 'technology',
    title: 'Technologie',
  },
  {
    color: '#15355A',
    manifesto:
      'Marchés, modèles économiques et stratégies d’entreprise pour décider avec davantage de lucidité.',
    slug: 'business',
    title: 'Business',
  },
  {
    color: '#2C5F7A',
    manifesto: 'Architecture, données, cloud et logiciels vus depuis le terrain opérationnel.',
    slug: 'information-systems',
    title: 'Systèmes d’information',
  },
  {
    color: '#5E7A3A',
    manifesto: 'Signaux économiques, sociaux et réglementaires qui transforment le continent.',
    slug: 'africa',
    title: 'Afrique',
  },
]

function textNode(text: string) {
  return {
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    text,
    type: 'text',
    version: 1,
  }
}

function createLexicalDocument(source: string): Post['content'] {
  const blocks = source
    .replace(/═+/g, '')
    .replace(/─+/g, '')
    .split(/\n\s*\n/g)
    .map((block) => block.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .filter((block) => !block.startsWith('Brouillon ·'))
    .filter((block) => !block.startsWith('À relire et publier'))
    .filter((block) => !block.startsWith('Mots :'))

  const children = blocks.map((block, index) => {
    const isHeading =
      index > 0 &&
      block.length < 90 &&
      block === block.toLocaleUpperCase('fr-FR') &&
      /[A-ZÀ-Ÿ]/.test(block)

    if (isHeading) {
      return {
        children: [textNode(block)],
        direction: 'ltr',
        format: '',
        indent: 0,
        tag: 'h2',
        type: 'heading',
        version: 1,
      }
    }

    return {
      children: [textNode(block)],
      direction: 'ltr',
      format: '',
      indent: 0,
      textFormat: 0,
      type: 'paragraph',
      version: 1,
    }
  })

  return {
    root: {
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  } as unknown as Post['content']
}

export const seed = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> => {
  if (!req.user) {
    throw new Error('An authenticated editor is required to seed Trigenys Insights.')
  }

  payload.logger.info('Seeding Trigenys Insights editorial data...')

  await Promise.all(
    globals.map((global) =>
      payload.updateGlobal({
        context: { disableRevalidate: true },
        data: { navItems: [] },
        depth: 0,
        slug: global,
      }),
    ),
  )

  await Promise.all(
    collections.map((collection) => payload.db.deleteMany({ collection, req, where: {} })),
  )

  await Promise.all(
    collections
      .filter((collection) => Boolean(payload.collections[collection].config.versions))
      .map((collection) => payload.db.deleteVersions({ collection, req, where: {} })),
  )

  const categoryDocs = []
  for (const category of categories) {
    categoryDocs.push(
      await payload.create({
        collection: 'categories',
        context: { disableRevalidate: true },
        data: category,
        depth: 0,
      }),
    )
  }

  await payload.create({
    collection: 'posts',
    context: { disableRevalidate: true },
    data: {
      _status: 'draft',
      authors: [req.user.id],
      categories: [categoryDocs[0].id, categoryDocs[1].id],
      content: createLexicalDocument(founderDraftSource),
      excerpt: founderDraftMetadata.excerpt,
      featured: true,
      kind: founderDraftMetadata.kind,
      meta: {
        description: founderDraftMetadata.excerpt,
        title: founderDraftMetadata.title,
      },
      readingTime: founderDraftMetadata.readingTime,
      slug: founderDraftMetadata.slug,
      title: founderDraftMetadata.title,
    },
    depth: 0,
    draft: true,
  })

  payload.logger.info('Seeded categories and the founder article as an unpublished draft.')
}
