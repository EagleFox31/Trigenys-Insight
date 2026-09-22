const LEGACY_PUBLIC_BLOB_ORIGIN =
  'https://z9hq1atmt6mlneyq.public.blob.vercel-storage.com/media'

export const shouldBypassImageOptimization =
  process.env.NEXT_PUBLIC_MEDIA_UNOPTIMIZED === 'true'

export function resolveMediaDeliveryUrl(url: string | null | undefined): string {
  if (!url) return ''

  if (url.startsWith('/api/media/file/')) {
    const filename = url.split('/').pop()

    if (filename) {
      return `${LEGACY_PUBLIC_BLOB_ORIGIN}/${filename}`
    }
  }

  return url
}
