const configuredMediaOrigin = process.env.NEXT_PUBLIC_MEDIA_ORIGIN?.replace(/\/$/, '') || ''

export const shouldBypassImageOptimization =
  process.env.NEXT_PUBLIC_MEDIA_UNOPTIMIZED === 'true'

export function resolveMediaDeliveryUrl(url: string | null | undefined): string {
  if (!url) return ''

  if (configuredMediaOrigin && url.startsWith('/api/media/file/')) {
    return `${configuredMediaOrigin}${url}`
  }

  return url
}
