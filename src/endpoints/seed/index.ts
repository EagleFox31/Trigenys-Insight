import type { Payload, PayloadRequest } from 'payload'

import type { Post } from '@/payload-types'
import {
  founderDraftMetadata,
  founderDraftSource,
  founderDraftSources,
} from './trigenys-founder-draft'

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
    .split(/\n\s*\n/g)
    .map((block) => block.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)

  const children = blocks.map((block) => {
    const heading = block.match(/^(#{2,4})\s+(.+)$/)

    if (heading) {
      return {
        children: [textNode(heading[2])],
        direction: 'ltr',
        format: '',
        indent: 0,
        tag: `h${heading[1].length}`,
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
    throw new Error('An authenticated editor is required to import Trigenys Insight content.')
  }

  payload.logger.info('Importing Trigenys Insight editorial starter content...')

  const author = await payload.findByID({
    collection: 'users',
    id: req.user.id,
    depth: 0,
    overrideAccess: false,
    req,
  })

  if (!author.name) {
    await payload.update({
      collection: 'users',
      id: author.id,
      data: { name: "Jennifer Lawrynn Aka'a" },
      depth: 0,
      overrideAccess: false,
      req,
    })
  }

  const categoryDocs = []
  for (const category of categories) {
    const existing = await payload.find({
      collection: 'categories',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: { slug: { equals: category.slug } },
    })

    categoryDocs.push(
      existing.docs[0] ??
        (await payload.create({
          collection: 'categories',
          context: { disableRevalidate: true },
          data: category,
          depth: 0,
          overrideAccess: false,
          req,
        })),
    )
  }

  const sourceDocs = []
  for (const source of founderDraftSources) {
    const existing = await payload.find({
      collection: 'research-sources',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: { url: { equals: source.url } },
    })

    sourceDocs.push(
      existing.docs[0] ??
        (await payload.create({
          collection: 'research-sources',
          data: source,
          depth: 0,
          overrideAccess: false,
          req,
        })),
    )
  }

  const postData = {
    _status: 'draft' as const,
    authors: [req.user.id],
    categories: [categoryDocs[0].id, categoryDocs[1].id],
    content: createLexicalDocument(founderDraftSource),
    excerpt: founderDraftMetadata.excerpt,
    featured: true,
    kind: founderDraftMetadata.kind,
    meta: {
      description: founderDraftMetadata.excerpt,
      title: 'Pipeline IA multi-agents : architecture et leçons',
    },
    readingTime: founderDraftMetadata.readingTime,
    slug: founderDraftMetadata.slug,
    sources: sourceDocs.map((source) => source.id),
    title: founderDraftMetadata.title,
  }

  const existingPost = await payload.find({
    collection: 'posts',
    depth: 0,
    draft: true,
    limit: 1,
    overrideAccess: false,
    req,
    where: { slug: { equals: founderDraftMetadata.slug } },
  })

  if (!existingPost.docs[0]) {
    await payload.create({
      collection: 'posts',
      context: { disableRevalidate: true },
      data: postData,
      depth: 0,
      draft: true,
      overrideAccess: false,
      req,
    })
  } else {
    payload.logger.info('Founder article draft already exists; leaving editorial changes intact.')
  }

  payload.logger.info('Imported categories, research sources, and the founder article draft.')
}
