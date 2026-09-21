import type { Payload, PayloadRequest } from 'payload'

import {
  createCybastionLexicalDocument,
  cybastionArticleMetadata,
  cybastionArticleSources,
} from '@/editorial/cybastion-data-center'

const wantedCategories = [
  {
    color: '#E07520',
    manifesto:
      "Technologie, intelligence artificielle et cybersécurité analysées depuis les réalités africaines.",
    slug: 'technology',
    title: 'Technologie',
  },
  {
    color: '#2C5F7A',
    manifesto: 'Architecture, données, cloud et logiciels vus depuis le terrain opérationnel.',
    slug: 'information-systems',
    title: "Systèmes d'information",
  },
  {
    color: '#5E7A3A',
    manifesto: 'Signaux économiques, sociaux et réglementaires qui transforment le continent.',
    slug: 'africa',
    title: 'Afrique',
  },
]

export async function importCybastionArticle({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}) {
  if (!req.user) {
    throw new Error('An authenticated editor is required to import this article.')
  }

  const existing = await payload.find({
    collection: 'posts',
    depth: 0,
    draft: true,
    limit: 1,
    overrideAccess: false,
    req,
    where: { slug: { equals: cybastionArticleMetadata.slug } },
  })

  if (existing.docs[0]) {
    return {
      created: false,
      id: existing.docs[0].id,
      slug: cybastionArticleMetadata.slug,
      title: cybastionArticleMetadata.title,
    }
  }

  const categoryIds: number[] = []

  for (const category of wantedCategories) {
    const match = await payload.find({
      collection: 'categories',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: { slug: { equals: category.slug } },
    })

    const doc =
      match.docs[0] ??
      (await payload.create({
        collection: 'categories',
        data: category,
        depth: 0,
        overrideAccess: false,
        req,
      }))

    categoryIds.push(doc.id)
  }

  const sourceIds: number[] = []

  for (const source of cybastionArticleSources) {
    const match = await payload.find({
      collection: 'research-sources',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      where: { url: { equals: source.url } },
    })

    const doc =
      match.docs[0] ??
      (await payload.create({
        collection: 'research-sources',
        data: source,
        depth: 0,
        overrideAccess: false,
        req,
      }))

    sourceIds.push(doc.id)
  }

  const post = await payload.create({
    collection: 'posts',
    data: {
      _status: 'draft',
      authors: [req.user.id],
      categories: categoryIds,
      content: createCybastionLexicalDocument(),
      editorsPick: true,
      excerpt: cybastionArticleMetadata.excerpt,
      featured: true,
      kind: cybastionArticleMetadata.kind,
      meta: {
        description: cybastionArticleMetadata.excerpt,
        title: cybastionArticleMetadata.metaTitle,
      },
      readingTime: cybastionArticleMetadata.readingTime,
      slug: cybastionArticleMetadata.slug,
      sources: sourceIds,
      title: cybastionArticleMetadata.title,
    },
    depth: 0,
    draft: true,
    overrideAccess: false,
    req,
  })

  return {
    created: true,
    id: post.id,
    slug: cybastionArticleMetadata.slug,
    title: cybastionArticleMetadata.title,
  }
}
