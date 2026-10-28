import path from 'node:path'
import { put } from '@vercel/blob'
import type { PayloadRequest } from 'payload'
import { EditorialError } from './errors'
import { publicMediaURL } from '@/integrations/buffer/socialAsset'

// Payload's current cloud-storage hook uploads sizes in parallel using the same
// metadata object. With random Blob suffixes, a size can overwrite the main
// filename. Preserve a canonical original for the 1080x1350 social contract.
export async function uploadOriginalSocialMedia(
  req: PayloadRequest,
  input: {
    name: string
    data: Buffer
    alt: string
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  },
) {
  const { name, data, alt, mimeType } = input
  const stem = name.slice(0, name.lastIndexOf('.'))
  const found = await req.payload.find({
    collection: 'media',
    where: {
      and: [
        { filename: { like: `${stem}%` } },
        { alt: { equals: alt } },
        { mimeType: { equals: mimeType } },
        { filesize: { equals: data.length } },
      ],
    },
    sort: 'id',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  let media = found.docs[0]
  if (media?.url && !/-\d+x\d+(?:-|\.)/.test(media.filename ?? '')) {
    try {
      const response = await fetch(publicMediaURL(media.url), {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      })
      await response.body?.cancel()
      if (
        response.ok &&
        Number(response.headers.get('content-length')) === data.length &&
        response.headers.get('content-type')?.split(';')[0] === mimeType
      )
        return { ok: true, id: media.id, url: media.url, reused: true }
    } catch {
      /* Repair a stale URL from the verified bytes supplied by the editor. */
    }
  }
  if (!media)
    media = await req.payload.create({
      collection: 'media',
      data: { alt },
      file: { data, mimetype: mimeType, name, size: data.length },
      overrideAccess: true,
      req,
    })
  let uploaded: Awaited<ReturnType<typeof put>>
  try {
    uploaded = await put(`media/${name}`, data, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
      access: 'public',
      addRandomSuffix: true,
      allowOverwrite: false,
      contentType: mimeType,
    })
  } catch {
    throw new EditorialError(503, 'social_original_upload_failed')
  }
  const url = publicMediaURL(uploaded.url)
  const originalFilename = path.posix.basename(uploaded.pathname)
  // beforeChange falls back to a previous filename when a size is cleared.
  // Point invalid derived entries at the verified original instead.
  const originalSize = {
    url,
    filename: originalFilename,
    width: 1080,
    height: 1350,
    mimeType,
    filesize: data.length,
  }
  await req.payload.update({
    collection: 'media',
    id: media.id,
    data: {
      alt,
      filename: originalFilename,
      url,
      prefix: 'media',
      mimeType,
      filesize: data.length,
      width: 1080,
      height: 1350,
      sizes: {
        thumbnail: originalSize,
        square: originalSize,
        small: originalSize,
        medium: originalSize,
        large: originalSize,
        xlarge: originalSize,
        og: originalSize,
      },
    },
    context: { skipCloudStorage: true },
    overrideAccess: true,
    req,
  })
  return { ok: true, id: media.id, url, reused: Boolean(found.docs[0]) }
}
