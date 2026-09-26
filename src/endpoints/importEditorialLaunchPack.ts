import type { Payload, PayloadRequest } from 'payload'
import type { Post } from '@/payload-types'

import {
  createEditorialLexicalDocument,
  editorialLaunchArticles,
} from '@/editorial/editorial-launch-pack'
import { learningAiBackwardsArticle } from '@/editorial/learning-ai-backwards'
import { fc27Article } from '@/editorial/fc27'
import { whispArticle } from '@/editorial/whisp'
import { cfaoArticle } from '@/editorial/cfao-mobility-cameroon'

const categoryDefinitions = {
  'consommer-camerounais': {
    color: '#E07520',
    manifesto: 'Guides d’achat et comparatifs de produits et services camerounais : prix, disponibilité, qualité et service après-vente.',
    manifestoEn: 'Buying guides and comparisons of Cameroonian products and services: price, availability, quality and after-sales support.',
    title: 'Consommer camerounais',
    titleEn: 'Buy Cameroonian',
  },
  technology: {
    color: '#E07520',
    manifesto:
      "Technologie, intelligence artificielle et cybersécurité analysées depuis les réalités africaines.",
    manifestoEn:
      'Technology, artificial intelligence and cybersecurity analysed through African realities.',
    title: 'Technologie',
    titleEn: 'Technology',
  },
  business: {
    color: '#15355A',
    manifesto:
      "Marchés, modèles économiques et stratégies d’entreprise pour décider avec davantage de lucidité.",
    manifestoEn:
      'Markets, business models and corporate strategy analysed without the hype.',
    title: 'Business',
    titleEn: 'Business',
  },
  'information-systems': {
    color: '#2C5F7A',
    manifesto: 'Architecture, données, cloud et logiciels vus depuis le terrain opérationnel.',
    manifestoEn: 'Architecture, data, cloud and software viewed from operational reality.',
    title: "Systèmes d'information",
    titleEn: 'Information Systems',
  },
  africa: {
    color: '#5E7A3A',
    manifesto: 'Signaux économiques, sociaux et réglementaires qui transforment le continent.',
    manifestoEn: 'Economic, social and regulatory signals reshaping the continent.',
    title: 'Afrique',
    titleEn: 'Africa',
  },
} as const

type CategorySlug = keyof typeof categoryDefinitions

async function ensureWhispWebsiteLink({ payload, req, id }: { payload: Payload; req: PayloadRequest; id: number }) {
  for (const locale of ['fr', 'en'] as const) {
    const post = await payload.findByID({
      collection: 'posts', id, locale, fallbackLocale: false, draft: true,
      depth: 0, overrideAccess: false, req,
    })
    if (!post.content || JSON.stringify(post.content).includes('https://whisp.cm/')) continue

    const content = structuredClone(post.content) as { root: { children: unknown[] } }
    const label = locale === 'fr' ? 'Découvrir le service : ' : 'Explore the service: '
    content.root.children.splice(2, 0, {
      children: [
        { detail: 0, format: 0, mode: 'normal', style: '', text: label, type: 'text', version: 1 },
        {
          children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: 'whisp.cm', type: 'text', version: 1 }],
          direction: 'ltr', fields: { linkType: 'custom', newTab: true, url: 'https://whisp.cm/' },
          format: '', indent: 0, type: 'link', version: 2,
        },
      ],
      direction: 'ltr', format: '', indent: 0, textFormat: 0, type: 'paragraph', version: 1,
    })
    await payload.update({
      collection: 'posts', id, locale, fallbackLocale: false, draft: true,
      data: { content: content as Post['content'] }, depth: 0, overrideAccess: false, req,
    })
  }
}

async function ensureCategory({
  payload,
  req,
  slug,
}: {
  payload: Payload
  req: PayloadRequest
  slug: CategorySlug
}) {
  const category = categoryDefinitions[slug]

  const match = await payload.find({
    collection: 'categories',
    depth: 0,
    fallbackLocale: false,
    limit: 1,
    locale: 'fr',
    overrideAccess: false,
    req,
    where: { slug: { equals: slug } },
  })

  const doc =
    match.docs[0] ??
    (await payload.create({
      collection: 'categories',
      data: {
        color: category.color,
        manifesto: category.manifesto,
        slug,
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

  return doc.id
}

export async function importEditorialLaunchPack({
  payload,
  req,
  onlySlug,
}: {
  payload: Payload
  req: PayloadRequest
  onlySlug?: string
}) {
  if (!req.user) {
    throw new Error('An authenticated editor is required to import the editorial launch pack.')
  }

  const categoryIds = new Map<CategorySlug, number>()

  for (const slug of Object.keys(categoryDefinitions) as CategorySlug[]) {
    const id = await ensureCategory({ payload, req, slug })
    categoryIds.set(slug, id as number)
  }

  const results: Array<{
    created: boolean
    englishCreated: boolean
    id: number
    slug: string
    title: string
  }> = []

  for (const article of [...editorialLaunchArticles, learningAiBackwardsArticle, fc27Article, whispArticle, cfaoArticle, freellmapiArticle].filter(
    (item) => !onlySlug || item.slug === onlySlug,
  )) {
    const existing = await payload.find({
      collection: 'posts',
      depth: 0,
      draft: true,
      fallbackLocale: false,
      limit: 1,
      locale: 'fr',
      overrideAccess: false,
      req,
      where: { slug: { equals: article.slug } },
    })

    const sourceIds: number[] = []

    for (const source of article.sources) {
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

      sourceIds.push(doc.id as number)
    }

    const articleCategoryIds = article.categories.map((slug) => {
      const id = categoryIds.get(slug as CategorySlug)
      if (!id) throw new Error(`Missing category during import: ${slug}`)
      return id
    })

    let post = existing.docs[0]
    let created = false

    if (!post) {
      post = await payload.create({
        collection: 'posts',
        data: {
          _status: 'draft',
          authors: [req.user.id],
          categories: articleCategoryIds,
          content: createEditorialLexicalDocument(article.fr.content, article.chart && { marker: article.chart.marker, data: article.chart.fr }),
          editorsPick: article.editorsPick,
          excerpt: article.fr.excerpt,
          featured: article.featured,
          kind: article.kind,
          meta: {
            description: article.fr.metaDescription,
            title: article.fr.metaTitle,
          },
          readingTime: article.readingTime,
          slug: article.slug,
          sources: sourceIds,
          title: article.fr.title,
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
          content: createEditorialLexicalDocument(article.en.content, article.chart && { marker: article.chart.marker, data: article.chart.en }),
          excerpt: article.en.excerpt,
          meta: {
            description: article.en.metaDescription,
            title: article.en.metaTitle,
          },
          title: article.en.title,
        },
        depth: 0,
        draft: true,
        fallbackLocale: false,
        locale: 'en',
        overrideAccess: false,
        req,
      })
    }

    if (article.slug === whispArticle.slug) {
      await ensureWhispWebsiteLink({ payload, req, id: post.id as number })
    }

    results.push({
      created,
      englishCreated: !hasEnglishTranslation,
      id: post.id as number,
      slug: article.slug,
      title: article.fr.title,
    })
  }

  return results
}
