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
import { ArticleHighlights } from '@/components/insights/ArticleHighlights'
import { ArticleBodyEnhancer } from '@/components/insights/ArticleBodyEnhancer'
import { ArticleTableOfContents } from '@/components/insights/ArticleTableOfContents'
import { extractArticleHighlights } from '@/components/insights/articleEditorial'

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
  const highlights = extractArticleHighlights(post.content)
  const visibleSources = post.sources?.filter((source) => typeof source === 'object') || []

  return (
    <article className="pb-20">
      {draft && <LivePreviewListener />}

      <PostHero locale={locale} post={post} />

      <div className="article-reading-shell">
        <div className="insights-shell article-reading-grid">
          <ArticleTableOfContents
            locale={locale}
            readingTime={post.readingTime}
            sourceCount={visibleSources.length}
          />

          <main className="article-reading-main" data-article-reading-main>
            <ArticleHighlights highlights={highlights} locale={locale} />

            <RichText className="article-content" data={post.content} enableGutter={false} />
            <ArticleBodyEnhancer locale={locale} />

            {visibleSources.length > 0 && (
              <section aria-labelledby="research-sources-title" className="article-sources">
                <h2 id="research-sources-title">{t.sourcesTitle}</h2>
                <p>{t.sourcesText}</p>
                <ol>
                  {visibleSources.map((source) => (
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
                className="mt-14"
                docs={post.relatedPosts.filter((relatedPost) => typeof relatedPost === 'object')}
                locale={locale}
              />
            )}
          </main>
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
