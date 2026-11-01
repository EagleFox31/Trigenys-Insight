import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'
import { isEditorialAnalyticsEnabled } from '@/lib/analytics/runtime'
import { articleFingerprint, clientIP, isKnownRobot } from '@/lib/articleViews/identity'
import { recordArticleView } from '@/lib/articleViews/store'

const inputSchema = z
  .object({ postId: z.number().int().positive(), locale: z.enum(['fr', 'en']) })
  .strict()
const empty = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })

async function readSmallJSON(req: PayloadRequest): Promise<unknown> {
  if (Number(req.headers.get('content-length')) > 256) throw new Error('too_large')
  if (!req.body) throw new Error('empty')
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 256) {
        await reader.cancel()
        throw new Error('too_large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export const articleViewsEndpoint: Endpoint = {
  path: '/article-views',
  method: 'post',
  handler: async (req) => {
    if (
      process.env.VERCEL_ENV !== 'production' ||
      !isEditorialAnalyticsEnabled() ||
      process.env.ARTICLE_VIEWS_ENABLED === 'false' ||
      req.user ||
      /(?:^|;\s*)__prerender_bypass=/.test(req.headers.get('cookie') ?? '') ||
      req.headers.get('dnt') === '1' ||
      req.headers.get('sec-gpc') === '1' ||
      isKnownRobot(req.headers.get('user-agent'))
    )
      return empty()

    let origin: string
    let referer: URL
    try {
      origin = new URL(process.env.NEXT_PUBLIC_SERVER_URL ?? '').origin
      if (req.headers.get('origin') !== origin) throw new Error('origin')
      if (req.headers.get('sec-fetch-site') && req.headers.get('sec-fetch-site') !== 'same-origin')
        throw new Error('site')
      if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
        throw new Error('type')
      referer = new URL(req.headers.get('referer') ?? '')
      if (referer.origin !== origin) throw new Error('referer')
    } catch {
      return Response.json(
        { error: 'invalid_origin' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    const ip = clientIP(req.headers)
    if (!ip) return empty()
    const input = inputSchema.safeParse(await readSmallJSON(req).catch(() => null))
    if (!input.success)
      return Response.json(
        { error: 'invalid_request' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    const { postId, locale } = input.data
    const fingerprint = articleFingerprint(postId, ip)
    if (!fingerprint) return empty()

    try {
      const posts = await req.payload.find({
        collection: 'posts',
        where: { id: { equals: postId } },
        draft: false,
        locale,
        fallbackLocale: false,
        depth: 0,
        limit: 1,
        overrideAccess: false,
        req,
        select: { title: true, slug: true, _status: true },
      })
      const post = posts.docs[0]
      if (!post?.title || !post.slug || post._status !== 'published') return empty()
      const path = decodeURIComponent(referer.pathname).replace(/\/$/, '')
      if (
        path !== `/${locale}/posts/${post.slug}` &&
        !(locale === 'fr' && path === `/posts/${post.slug}`)
      )
        return empty()
      await recordArticleView(req.payload.db.pool, postId, fingerprint, locale)
    } catch {
      // Never log the request, headers, IP, fingerprint or raw database errors.
      // A tracking outage must not interfere with article reading.
      req.payload.logger.warn('Article view collector unavailable')
    }
    // Identical response for a new view, duplicate, or non-public article.
    return empty()
  },
}
