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
import { redirectOldPostSlug } from '@/components/insights/resolvePostSlugRedirect'
import { ArticleFaq } from '@/components/insights/ArticleFaq'
import { ArticleBodyEnhancer } from '@/components/insights/ArticleBodyEnhancer'
import { PaymentFinder } from '@/components/payment-finder/PaymentFinder'
import { PaymentFinderEnglish } from '@/components/payment-finder/PaymentFinderEnglish'
import { ArticleTableOfContents } from '@/components/insights/ArticleTableOfContents'
import { extractArticleHighlights } from '@/components/insights/articleEditorial'
import { TrackedOutboundLink } from '@/components/analytics/TrackedOutboundLink'
import { getEditorialVisuals } from '@/editorial/editorial-visuals'
import {
  absoluteCanonicalURL,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildJsonLdGraph,
  mediaURL,
  serializeJsonLd,
  SITE_IDENTITY,
} from '@/seo/structuredData'
import { getFaqItems, getKeyTakeaways } from '@/seo/answerContent'
import { getPublicAuthorProfiles } from '@/seo/authorProfiles'
import { selectContextualLinks } from '@/seo/contextualLinks'
import { matchTrigenysProduct } from '@/seo/trigenysProducts'
import { formatPostDate } from '@/i18n/content'
import type { Post } from '@/payload-types'

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

async function queryLinkCandidates({ locale, post }: { locale: SiteLocale; post: Post }) {
  try {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'posts',
      depth: 1,
      fallbackLocale: false,
      limit: 12,
      locale,
      overrideAccess: false,
      pagination: false,
      sort: '-publishedAt',
      where: {
        and: [{ _status: { equals: 'published' } }, { id: { not_equals: post.id } }],
      },
    })
    return result.docs.filter((doc) => Boolean(doc.title && doc.slug))
  } catch (error) {
    console.warn('Trigenys Insights: contextual link candidates unavailable.', error)
    return []
  }
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

  if (!post) {
    await redirectOldPostSlug(decodedSlug, locale)
    notFound()
  }

  const t = getMessages(locale).post
  const highlights = extractArticleHighlights(post.content)
  const takeaways = getKeyTakeaways(post)
  const faqItems = getFaqItems(post)
  const visibleSources = post.sources?.filter((source) => typeof source === 'object') || []
  const published = !draft && post._status === 'published'
  const authorProfiles = published ? await getPublicAuthorProfiles(locale) : {}
  const articleJsonLd = published
    ? buildArticleJsonLd({ locale, post, slug: decodedSlug, authorProfiles })
    : null
  const editorPicks = (post.relatedPosts || []).filter(
    (relatedPost): relatedPost is Post => typeof relatedPost === 'object' && relatedPost !== null,
  )
  const contextualLinks = selectContextualLinks(
    post,
    editorPicks,
    await queryLinkCandidates({ locale, post }),
  )
  const categoryTitles = (post.categories || []).map((category) =>
    typeof category === 'object' && category ? category.title : null,
  )
  const product = matchTrigenysProduct({
    title: post.title,
    excerpt: post.excerpt,
    categories: categoryTitles,
  })
  const breadcrumbJsonLd =
    !draft && post._status === 'published'
      ? buildBreadcrumbJsonLd([
          { name: locale === 'fr' ? 'Accueil' : 'Home', path: `/${locale}` },
          { name: locale === 'fr' ? 'Analyses' : 'Analysis', path: `/${locale}/posts` },
          { name: post.title, path: `/${locale}/posts/${decodedSlug}` },
        ])
      : null
  const faqJsonLd =
    !draft && post._status === 'published'
      ? buildFaqJsonLd({ locale, post, slug: decodedSlug })
      : null
  const pageJsonLd =
    articleJsonLd && breadcrumbJsonLd
      ? buildJsonLdGraph(articleJsonLd, breadcrumbJsonLd, faqJsonLd)
      : null

  return (
    <article className="pb-20">
      {pageJsonLd && (
        <script
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(pageJsonLd) }}
          type="application/ld+json"
        />
      )}

      {draft && <LivePreviewListener />}

      <PostHero analyticsEnabled={!draft} locale={locale} post={post} />

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
            <ArticleHighlights highlights={highlights} locale={locale} takeaways={takeaways} />

            <RichText className="article-content" data={post.content} enableGutter={false} />
            <ArticleBodyEnhancer locale={locale} slug={decodedSlug} />

            {/* Shared recommendation engine: match the article's locale for post #36. */}
            {post.id === 36 && (locale === 'fr' ? <PaymentFinder embedded /> : <PaymentFinderEnglish embedded />)}

            <ArticleFaq items={faqItems} locale={locale} />


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
                        sourceId={source.id}
                        sourcePosition={index + 1}
                        target="_blank"
                      >
                        {source.title}
                      </TrackedOutboundLink>
                      {source.publisher && (
                        <span className="text-muted-foreground"> — {source.publisher}</span>
                      )}
                      {source.publishedAt && (
                        <span className="text-muted-foreground">
                          {' '}
                          ({t.sourcePublished}{' '}
                          <time dateTime={source.publishedAt}>
                            {formatPostDate(source.publishedAt, locale)}
                          </time>
                          )
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {product && (
              <aside aria-labelledby="trigenys-product-title" className="article-product mt-14">
                <h2 id="trigenys-product-title">{t.productTitle}</h2>
                <p>
                  <strong>{product.name}</strong> — {product.pitch[locale]}{' '}
                  <TrackedOutboundLink
                    className="font-medium underline underline-offset-4"
                    context={`product-${product.id}`}
                    href={product.url}
                    locale={locale}
                    rel="noopener"
                    slug={decodedSlug}
                    target="_blank"
                  >
                    {t.productCta} {product.name}
                  </TrackedOutboundLink>
                </p>
              </aside>
            )}

            {contextualLinks.length > 0 && (
              <section aria-labelledby="read-next-title" className="mt-14">
                <h2 id="read-next-title">{t.readNextTitle}</h2>
                <RelatedPosts className="mt-6" docs={contextualLinks} locale={locale} />
              </section>
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
  const editorialVisuals = getEditorialVisuals(decodedSlug)
  const socialImage =
    // The generated 1200x630 derivatives are missing for many legacy media.
    // Prefer the same verified original Hero used by the public article.
    mediaURL(post.heroImage) ||
    mediaURL(post.meta?.image) ||
    (editorialVisuals?.hero ? absoluteCanonicalURL(editorialVisuals.hero.src) : null) ||
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
    robots: draft
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    alternates: {
      canonical: canonicalURL,
      languages,
      types: draft ? undefined : { 'text/markdown': `${canonicalURL}.md` },
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
