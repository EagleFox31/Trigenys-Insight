import type { SiteLocale } from '@/i18n/config'
import { absoluteCanonicalURL, SITE_IDENTITY } from '@/seo/structuredData'

export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
export const INDEXNOW_KEY_LOCATION = absoluteCanonicalURL('/indexnow-key.txt')
export const INDEXNOW_KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/

export type IndexNowResult =
  | { status: 'skipped'; reason: 'not-configured' | 'invalid-key' | 'no-valid-urls' }
  | { status: 'submitted'; count: number; httpStatus: number }
  | { status: 'failed'; count: number; httpStatus?: number; error: string }

type PublicLocalizedPost = {
  title?: unknown
  excerpt?: unknown
  content?: unknown
}

export function getIndexNowKey() {
  const key = process.env.INDEXNOW_KEY?.trim()

  if (!key) return null
  if (!INDEXNOW_KEY_PATTERN.test(key)) return null

  return key
}

export function isIndexNowKeyConfigured() {
  const raw = process.env.INDEXNOW_KEY?.trim()
  if (!raw) return { configured: false as const, reason: 'not-configured' as const }
  if (!INDEXNOW_KEY_PATTERN.test(raw)) {
    return { configured: false as const, reason: 'invalid-key' as const }
  }

  return { configured: true as const, key: raw }
}

export function normalizeIndexNowUrls(urls: string[]) {
  const host = new URL(SITE_IDENTITY.url).host
  const valid = new Set<string>()

  for (const value of urls) {
    try {
      const url = new URL(value)

      if (url.protocol !== 'https:' || url.host !== host) continue
      valid.add(url.toString())
    } catch {
      // Ignore malformed URLs instead of sending them to IndexNow.
    }
  }

  return [...valid]
}

export function indexNowPostFingerprint(post: Record<string, unknown>) {
  return JSON.stringify({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    heroImage: post.heroImage,
    categories: post.categories,
    meta: post.meta,
    publishedAt: post.publishedAt,
    authors: post.authors,
    sources: post.sources,
    relatedPosts: post.relatedPosts,
  })
}

export async function collectLocalizedPostUrls({
  slug,
  loadLocale,
}: {
  slug: string
  loadLocale: (locale: SiteLocale) => Promise<PublicLocalizedPost | null | undefined>
}) {
  const urls: string[] = []

  for (const locale of ['fr', 'en'] as const) {
    const post = await loadLocale(locale)

    if (!post?.title || !post?.excerpt || !post?.content) continue
    urls.push(absoluteCanonicalURL(`/${locale}/posts/${slug}`))
  }

  return urls
}

export async function submitIndexNowUrls(
  urls: string[],
  options?: {
    fetchImpl?: typeof fetch
    timeoutMs?: number
  },
): Promise<IndexNowResult> {
  const keyState = isIndexNowKeyConfigured()

  if (!keyState.configured) {
    return { status: 'skipped', reason: keyState.reason }
  }

  const urlList = normalizeIndexNowUrls(urls)

  if (urlList.length === 0) {
    return { status: 'skipped', reason: 'no-valid-urls' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 2500)
  const fetchImpl = options?.fetchImpl || fetch

  try {
    const response = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        host: new URL(SITE_IDENTITY.url).host,
        key: keyState.key,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList,
      }),
      signal: controller.signal,
    })

    if (!response.ok && response.status !== 202) {
      return {
        status: 'failed',
        count: urlList.length,
        httpStatus: response.status,
        error: `IndexNow returned HTTP ${response.status}`,
      }
    }

    return {
      status: 'submitted',
      count: urlList.length,
      httpStatus: response.status,
    }
  } catch (error) {
    return {
      status: 'failed',
      count: urlList.length,
      error: error instanceof Error ? error.message : 'Unknown IndexNow error',
    }
  } finally {
    clearTimeout(timeout)
  }
}
