import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { draftMode } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { SiteLocale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import RichText from '@/components/RichText'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { PostHero } from '@/heros/PostHero'
import { generateMeta } from '@/utilities/generateMeta'

async function queryPostBySlug({
  locale,
  slug,
  draft,
}: {
  locale: SiteLocale
  slug: string
  draft: boolean
}) {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    draft,
    fallbackLocale: false,
    limit: 1,
    locale,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  const post = result.docs?.[0] || null

  if (!post?.title || !post?.excerpt || !post?.content) return null
  return post
}

export async function LocalizedPostPage({
  locale,
  slug,
}: {
  locale: SiteLocale
  slug: string
}) {
  const { isEnabled: draft } = await draftMode()
  const decodedSlug = decodeURIComponent(slug)
  const post = await queryPostBySlug({ locale, slug: decodedSlug, draft })

  if (!post) notFound()

  const t = getMessages(locale).post

  return (
    <article className="pb-20">
      {draft && <LivePreviewListener />}

      <PostHero locale={locale} post={post} />

      <div className="flex flex-col items-center gap-4 pt-14">
        <div className="container">
          <RichText className="max-w-[48rem] mx-auto" data={post.content} enableGutter={false} />

          {post.sources && post.sources.length > 0 && (
            <section
              aria-labelledby="research-sources-title"
              className="mx-auto mt-14 max-w-[48rem] border-t border-border pt-8"
            >
              <h2 className="mb-5 text-2xl font-semibold" id="research-sources-title">
                {t.sourcesTitle}
              </h2>
              <p className="mb-6 text-sm leading-6 text-muted-foreground">{t.sourcesText}</p>
              <ol className="space-y-4">
                {post.sources
                  .filter((source) => typeof source === 'object')
                  .map((source) => (
                    <li className="text-sm leading-6" key={source.id}>
                      <a
                        className="font-medium underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
                        href={source.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {source.title}
                      </a>
                      {source.publisher && (
                        <span className="text-muted-foreground"> — {source.publisher}</span>
                      )}
                    </li>
                  ))}
              </ol>
            </section>
          )}

          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <RelatedPosts
              className="mt-12 max-w-[52rem] lg:grid lg:grid-cols-subgrid col-start-1 col-span-3 grid-rows-[2fr]"
              docs={post.relatedPosts.filter((relatedPost) => typeof relatedPost === 'object')}
            />
          )}
        </div>
      </div>
    </article>
  )
}

export async function localizedPostMetadata({
  locale,
  slug,
}: {
  locale: SiteLocale
  slug: string
}): Promise<Metadata> {
  const { isEnabled: draft } = await draftMode()
  const decodedSlug = decodeURIComponent(slug)
  const post = await queryPostBySlug({ locale, slug: decodedSlug, draft })

  if (!post) {
    return {
      title: locale === 'fr' ? 'Article introuvable' : 'Article not found',
      robots: { index: false, follow: false },
    }
  }

  const otherLocale: SiteLocale = locale === 'fr' ? 'en' : 'fr'
  const translated = await queryPostBySlug({
    locale: otherLocale,
    slug: decodedSlug,
    draft,
  })

  const base = await generateMeta({ doc: post })
  const languages: Record<string, string> = {
    [locale]: `/${locale}/posts/${decodedSlug}`,
  }

  if (translated) {
    languages[otherLocale] = `/${otherLocale}/posts/${decodedSlug}`
  }

  if (locale === 'fr') {
    languages['x-default'] = `/fr/posts/${decodedSlug}`
  }

  return {
    ...base,
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/${locale}/posts/${decodedSlug}`,
      languages,
    },
  }
}
