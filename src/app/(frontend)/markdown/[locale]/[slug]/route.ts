import { getPayload } from 'payload'
import config from '@payload-config'

import { isSiteLocale } from '@/i18n/config'
import { renderPostMarkdown } from '@/seo/llms'
import { isPublicLocalizedPost } from '@/seo/postsSitemap'
import { absoluteCanonicalURL } from '@/seo/structuredData'

// Served publicly as /{locale}/posts/{slug}.md through a rewrite in next.config.
type Args = { params: Promise<{ locale: string; slug: string }> }

export async function GET(_request: Request, { params }: Args) {
  const { locale, slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)

  if (!isSiteLocale(locale)) return new Response('Not found', { status: 404 })

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'posts',
    overrideAccess: false,
    draft: false,
    depth: 1,
    fallbackLocale: false,
    locale,
    limit: 1,
    pagination: false,
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
  })

  const post = result.docs[0]
  if (!post || !isPublicLocalizedPost(post)) return new Response('Not found', { status: 404 })

  return new Response(`${renderPostMarkdown(locale, post)}\n`, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      // The HTML article stays the canonical, indexable document.
      Link: `<${absoluteCanonicalURL(`/${locale}/posts/${slug}`)}>; rel="canonical"`,
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}
