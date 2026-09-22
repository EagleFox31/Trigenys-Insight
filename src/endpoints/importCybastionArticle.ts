import type { Payload, PayloadRequest } from 'payload'

import {
  createCybastionLexicalDocument,
  createCybastionLexicalDocumentEn,
  cybastionArticleMetadata,
  cybastionArticleMetadataEn,
  cybastionArticleSources,
} from '@/editorial/cybastion-data-center'

const wantedCategories = [
  {
    color: '#E07520',
    manifesto:
      "Technologie, intelligence artificielle et cybersécurité analysées depuis les réalités africaines.",
    manifestoEn:
      'Technology, artificial intelligence and cybersecurity analysed through African realities.',
    slug: 'technology',
    title: 'Technologie',
    titleEn: 'Technology',
  },
  {
    color: '#2C5F7A',
    manifesto: 'Architecture, données, cloud et logiciels vus depuis le terrain opérationnel.',
    manifestoEn: 'Architecture, data, cloud and software viewed from operational reality.',
    slug: 'information-systems',
    title: "Systèmes d'information",
    titleEn: 'Information Systems',
  },
  {
    color: '#5E7A3A',
    manifesto: 'Signaux économiques, sociaux et réglementaires qui transforment le continent.',
    manifestoEn: 'Economic, social and regulatory signals reshaping the continent.',
    slug: 'africa',
    title: 'Afrique',
    titleEn: 'Africa',
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
    fallbackLocale: false,
    limit: 1,
    locale: 'fr',
    overrideAccess: false,
    req,
    where: { slug: { equals: cybastionArticleMetadata.slug } },
  })

  const categoryIds: number[] = []

  for (const category of wantedCategories) {
    const match = await payload.find({
      collection: 'categories',
      depth: 0,
      fallbackLocale: false,
      limit: 1,
      locale: 'fr',
      overrideAccess: false,
      req,
      where: { slug: { equals: category.slug } },
    })

    const doc =
      match.docs[0] ??
      (await payload.create({
        collection: 'categories',
        data: {
          color: category.color,
          manifesto: category.manifesto,
          slug: category.slug,
          title: category.title,
        },
        depth: 0,
        locale: 'fr',
        overrideAccess: false,
        req,
      }))

    await payload.update({
      collection: 'categories',
      id: doc.id,
      data: {
        manifesto: category.manifestoEn,
        title: category.titleEn,
      },
      depth: 0,
      fallbackLocale: false,
      locale: 'en',
      overrideAccess: false,
      req,
    })

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

  let post = existing.docs[0]
  let created = false

  if (!post) {
    post = await payload.create({
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
      locale: 'fr',
      overrideAccess: false,
      req,
    })
    created = true
  }

  const existingEnglish = await payload.findByID({
    collection: 'posts',
    id: post.id,
    depth: 0,
    draft: true,
    fallbackLocale: false,
    locale: 'en',
    overrideAccess: false,
    req,
  })

  const hasEnglishTranslation = Boolean(
    existingEnglish?.title && existingEnglish?.excerpt && existingEnglish?.content,
  )

  if (!hasEnglishTranslation) {
    await payload.update({
      collection: 'posts',
      id: post.id,
      data: {
        content: createCybastionLexicalDocumentEn(),
        excerpt: cybastionArticleMetadataEn.excerpt,
        meta: {
          description: cybastionArticleMetadataEn.metaDescription,
          title: cybastionArticleMetadataEn.metaTitle,
        },
        title: cybastionArticleMetadataEn.title,
      },
      depth: 0,
      draft: true,
      fallbackLocale: false,
      locale: 'en',
      overrideAccess: false,
      req,
    })
  }

  return {
    created,
    englishCreated: !hasEnglishTranslation,
    id: post.id,
    slug: cybastionArticleMetadata.slug,
    title: cybastionArticleMetadata.title,
  }
}
