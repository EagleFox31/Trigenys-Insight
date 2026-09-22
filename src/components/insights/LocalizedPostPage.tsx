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
import { ArticleHighlights } from '@/components/insights/ArticleHighlights'
import { ArticleBodyEnhancer } from '@/components/insights/ArticleBodyEnhancer'
import { ArticleTableOfContents } from '@/components/insights/ArticleTableOfContents'
import { extractArticleHighlights } from '@/components/insights/articleEditorial'
import { TrackedOutboundLink } from '@/components/analytics/TrackedOutboundLink'
import {
  absoluteCanonicalURL,
  buildArticleJsonLd,
  mediaURL,
  serializeJsonLd,
  SITE_IDENTITY,
} from '@/seo/structuredData'

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
  const articleJsonLd = !draft && post._status === 'published'
    ? buildArticleJsonLd({ locale, post, slug: decodedSlug })
    : null

  return (
    <article className="pb-20">
      {articleJsonLd && (
        <script
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
          type="application/ld+json"
        />
      )}

      {draft && <LivePreviewListener />}

      <PostHero locale={locale} post={post} />

      <div className="article-reading-shell">
        <div className="insights-shell article-reading-grid">
          <ArticleTableOfContents
            analyticsEnabled={!draft}
            locale={locale}
            readingTime={post.readingTime}
            slug={decodedSlug}
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
                  {visibleSources.map((source, index) => (
                    <li className="text-sm leading-6" key={source.id}>
                      <TrackedOutboundLink
                        className="font-medium underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
                        context={`source-${index + 1}`}
                        href={source.url}
                        locale={locale}
                        rel="noreferrer"
                        slug={decodedSlug}
                        target="_blank"
                      >
                        {source.title}
                      </TrackedOutboundLink>
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

  const canonicalURL = absoluteCanonicalURL(`/${locale}/posts/${decodedSlug}`)
  const otherURL = absoluteCanonicalURL(`/${otherLocale}/posts/${decodedSlug}`)
  const defaultURL = absoluteCanonicalURL(`/fr/posts/${decodedSlug}`)
  const seoTitle = post.meta?.title || post.title
  const seoDescription = post.meta?.description || post.excerpt
  const socialImage =
    mediaURL(post.meta?.image, 'og') ||
    mediaURL(post.heroImage) ||
    absoluteCanonicalURL('/api/og')

  const languages: Record<string, string> = {
    [locale]: canonicalURL,
    'x-default': defaultURL,
  }

  if (translated) {
    languages[otherLocale] = otherURL
  }

  const authorNames =
    post.populatedAuthors
      ?.map((author) => author?.name?.trim())
      .filter((name): name is string => Boolean(name)) || []

  return {
    title: seoTitle,
    description: seoDescription,
    robots: draft ? { index: false, follow: false } : undefined,
    alternates: {
      canonical: canonicalURL,
      languages,
    },
    openGraph: {
      type: 'article',
      title: seoTitle,
      description: seoDescription,
      url: canonicalURL,
      siteName: SITE_IDENTITY.name,
      images: [{ url: socialImage }],
      locale: locale === 'fr' ? 'fr_FR' : 'en_GB',
      alternateLocale: translated ? [otherLocale === 'fr' ? 'fr_FR' : 'en_GB'] : undefined,
      publishedTime: post.publishedAt || post.createdAt,
      modifiedTime: post.updatedAt,
      authors: authorNames.length > 0 ? authorNames : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      images: [socialImage],
    },
  }
}
