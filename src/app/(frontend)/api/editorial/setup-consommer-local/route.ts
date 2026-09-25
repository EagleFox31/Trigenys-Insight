import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

const categories = [
  {
    slug: 'consommer-camerounais', color: '#E07520',
    fr: { title: 'Consommer camerounais', manifesto: 'Guides d’achat et comparatifs de produits et services camerounais : prix, disponibilité, qualité et service après-vente.' },
    en: { title: 'Buy Cameroonian', manifesto: 'Buying guides and comparisons of Cameroonian products and services: price, availability, quality and after-sales support.' },
  },
  {
    slug: 'consommer-africain', color: '#5E7A3A',
    fr: { title: 'Consommer africain', manifesto: 'Produits et services africains examinés selon leur disponibilité, leurs prix, la livraison et les conditions de paiement.' },
    en: { title: 'Buy African', manifesto: 'African products and services assessed for availability, prices, delivery and payment terms.' },
  },
] as const

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return Response.json({ success: false, message: 'Connecte-toi à Payload.' }, { status: 403 })

  try {
    const req = await createLocalReq({ user }, payload)
    const results = []
    for (const category of categories) {
      const match = await payload.find({
        collection: 'categories', depth: 0, fallbackLocale: false, locale: 'fr', limit: 1,
        overrideAccess: false, req, where: { slug: { equals: category.slug } },
      })
      const existing = match.docs[0]
      const doc = existing ?? await payload.create({
        collection: 'categories', locale: 'fr', depth: 0, overrideAccess: false, req,
        data: { slug: category.slug, color: category.color, ...category.fr },
      })
      if (!existing) await payload.update({
        collection: 'categories', id: doc.id, locale: 'en', fallbackLocale: false,
        depth: 0, overrideAccess: false, req, data: category.en,
      })
      results.push({ slug: category.slug, id: doc.id, created: !existing })
    }
    return Response.json({ success: true, results, message: 'Les deux catégories FR/EN sont prêtes dans Payload. Associe chaque article à la série correspondante.' })
  } catch (error) {
    payload.logger.error({ err: error, message: 'Local consumption category setup failed' })
    return Response.json({ success: false, message: 'Création des catégories impossible. Réessaie.' }, { status: 500 })
  }
}
