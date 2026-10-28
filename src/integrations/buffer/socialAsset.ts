import type { PayloadRequest } from 'payload'
import { EditorialError } from '@/automation/errors'
import type { BufferPost } from './client'

export type SocialAsset = {
  mediaId: number
  postId: number
  locale: 'fr' | 'en'
  channelId: string
  url: string
  alt: string
  mimeType: string
  width: number
  height: number
}

export function publicMediaURL(value: string): string {
  let url: URL
  try {
    url = new URL(value, 'https://insight.trigenys.com')
  } catch {
    throw new EditorialError(422, 'social_image_url_not_supported')
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !(
      url.hostname === 'insight.trigenys.com' ||
      url.hostname.endsWith('.public.blob.vercel-storage.com')
    )
  )
    throw new EditorialError(422, 'social_image_url_not_supported')
  return url.toString()
}

// Only IDs from this CMS's media collection are accepted. A caller cannot pass
// an arbitrary remote URL. Explicit selection records approval for this exact
// article, locale and channel, without modifying heroImage or article content.
export async function selectSocialAsset(
  req: PayloadRequest,
  mediaId: number,
  postId: number,
  locale: 'fr' | 'en',
  channelId: string,
): Promise<SocialAsset> {
  const media = await req.payload.findByID({
    collection: 'media',
    id: mediaId,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (!media || /archive/i.test(media.filename ?? ''))
    throw new EditorialError(422, 'social_asset_archived_or_missing')
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(media.mimeType ?? '') ||
    !media.filesize ||
    media.filesize > 3 * 1024 * 1024 ||
    media.width !== 1080 ||
    media.height !== 1350 ||
    !media.alt?.trim() ||
    !media.url
  )
    throw new EditorialError(422, 'social_asset_requires_1080x1350_image_and_alt')
  const url = publicMediaURL(media.url)
  let response: Response
  try {
    response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
  } catch {
    throw new EditorialError(422, 'social_asset_not_publicly_accessible')
  }
  await response.body?.cancel()
  if (
    !response.ok ||
    response.headers.get('content-type')?.split(';')[0] !== media.mimeType ||
    Number(response.headers.get('content-length')) !== media.filesize
  )
    throw new EditorialError(422, 'social_asset_requires_public_original_file')
  return {
    mediaId,
    postId,
    locale,
    channelId,
    url,
    alt: media.alt.trim(),
    mimeType: media.mimeType!,
    width: 1080,
    height: 1350,
  }
}

export function imageMatches(post: BufferPost, expectedURL?: string): boolean {
  if (!expectedURL) return !post.assets?.length
  return (
    post.assets?.length === 1 &&
    post.assets[0].source === expectedURL &&
    post.assets[0].mimeType.startsWith('image/')
  )
}
