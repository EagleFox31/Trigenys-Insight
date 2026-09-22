const configuredMediaOrigin = process.env.NEXT_PUBLIC_MEDIA_ORIGIN?.replace(/\/$/, '') || ''
const configuredBlobOrigin = process.env.NEXT_PUBLIC_MEDIA_BLOB_ORIGIN?.replace(/\/$/, '') || ''

export const shouldBypassImageOptimization =
  process.env.NEXT_PUBLIC_MEDIA_UNOPTIMIZED === 'true'

export function resolveMediaDeliveryUrl(url: string | null | undefined): string {
  if (!url) return ''

  if (url.startsWith('/api/media/file/')) {
    const filename = url.split('/').pop()

    if (configuredBlobOrigin && filename) {
      return `${configuredBlobOrigin}/${filename}`
    }

    if (configuredMediaOrigin) {
      return `${configuredMediaOrigin}${url}`
    }
  }

  return url
}
