import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import type { Post } from '@/payload-types'

import { PostHero } from '@/heros/PostHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Post({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/posts/' + decodedSlug
  const post = await queryPostBySlug({ slug: decodedSlug })

  if (!post) return <PayloadRedirects url={url} />

  return (
    <article className="pb-20">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <PostHero post={post} />

      <div className="flex flex-col items-center gap-4 pt-14">
        <div className="container">
          <RichText className="max-w-[48rem] mx-auto" data={post.content} enableGutter={false} />
          {post.sources && post.sources.length > 0 && (
            <section
              aria-labelledby="research-sources-title"
              className="mx-auto mt-14 max-w-[48rem] border-t border-border pt-8"
            >
              <h2 className="mb-5 text-2xl font-semibold" id="research-sources-title">
                Sources et méthode
              </h2>
              <p className="mb-6 text-sm leading-6 text-muted-foreground">
                Les faits susceptibles d’évoluer ont été revérifiés dans les sources officielles
                ci-dessous. Les observations personnelles et les résultats du prototype sont
                présentés comme tels dans l’article.
              </p>
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
              docs={post.relatedPosts.filter((post) => typeof post === 'object')}
            />
          )}
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const post = await queryPostBySlug({ slug: decodedSlug })

  return generateMeta({ doc: post })
}

const queryPostBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
