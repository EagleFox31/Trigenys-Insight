// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { put } from '@vercel/blob'
import { uploadOriginalEditorialMedia, uploadOriginalSocialMedia } from '@/automation/socialMediaUpload'
vi.mock('@vercel/blob', () => ({ put: vi.fn() }))
const name = `automation-${'a'.repeat(64)}.webp`
const filename = `${name.slice(0, -5)}-original.webp`
const url = `https://example.public.blob.vercel-storage.com/media/${filename}`
const input = {
  name,
  data: Buffer.from('verified original image bytes'),
  alt: 'French social banner',
  mimeType: 'image/webp' as const,
}
function fixture(existing: unknown) {
  const payload = {
    find: vi.fn(async () => ({ docs: existing ? [existing] : [] })),
    create: vi.fn(async () => ({ id: 72 })),
    update: vi.fn(async () => ({ id: 69 })),
  }
  vi.mocked(put).mockResolvedValue({ url, pathname: `media/${filename}` } as Awaited<
    ReturnType<typeof put>
  >)
  return { payload, req: { payload } as unknown as PayloadRequest }
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
describe('original social media upload', () => {
  it('repairs a stale landscape Hero Blob URL on the same CMS media ID', async () => {
    const f = fixture({
      id: 75,
      filename: name,
      url: 'https://example.public.blob.vercel-storage.com/missing-original.webp',
      mimeType: 'image/webp',
      filesize: input.data.length,
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })))
    expect(
      await uploadOriginalEditorialMedia(f.req, input, { width: 1280, height: 720 }),
    ).toMatchObject({ id: 75, url, reused: true })
    expect(put).toHaveBeenCalledOnce()
    expect(f.payload.create).not.toHaveBeenCalled()
    expect(f.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        id: 75,
        context: { skipCloudStorage: true },
        data: expect.objectContaining({
          url,
          width: 1280,
          height: 720,
          sizes: expect.objectContaining({
            large: expect.objectContaining({ width: 1280, height: 720, url }),
            og: expect.objectContaining({ width: 1280, height: 720, url }),
          }),
        }),
      }),
    )
  })
  it('refuses invalid dimensions before changing a Hero record', async () => {
    const f = fixture(null)
    await expect(
      uploadOriginalEditorialMedia(f.req, input, { width: 0, height: 720 }),
    ).rejects.toMatchObject({ code: 'invalid_image_dimensions' })
    expect(f.payload.find).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
  })
  it('repairs a thumbnail filename on the same media record using the original bytes', async () => {
    const f = fixture({
      id: 69,
      filename: `${name.slice(0, -5)}-300x375-random.webp`,
      url: 'https://example.public.blob.vercel-storage.com/thumbnail.webp',
    })
    expect(await uploadOriginalSocialMedia(f.req, input)).toMatchObject({
      id: 69,
      url,
      reused: true,
    })
    expect(put).toHaveBeenCalledWith(
      `media/${name}`,
      input.data,
      expect.objectContaining({
        addRandomSuffix: true,
        allowOverwrite: false,
        contentType: 'image/webp',
      }),
    )
    expect(f.payload.create).not.toHaveBeenCalled()
    expect(f.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        id: 69,
        context: { skipCloudStorage: true },
        data: expect.objectContaining({
          filename,
          url,
          width: 1080,
          height: 1350,
          filesize: input.data.length,
          sizes: expect.objectContaining({
            thumbnail: expect.objectContaining({ filename, url, width: 1080, height: 1350 }),
          }),
        }),
      }),
    )
  })
  it('reuses a verified canonical original without uploading another file', async () => {
    const f = fixture({ id: 69, filename, url })
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(null, {
            headers: { 'content-type': 'image/webp', 'content-length': String(input.data.length) },
          }),
      ),
    )
    expect(await uploadOriginalSocialMedia(f.req, input)).toMatchObject({ id: 69, reused: true })
    expect(put).not.toHaveBeenCalled()
    expect(f.payload.update).not.toHaveBeenCalled()
  })
  it('creates the media before persisting its verified original Blob filename', async () => {
    const f = fixture(null)
    expect(await uploadOriginalSocialMedia(f.req, input)).toMatchObject({ id: 72, reused: false })
    expect(f.payload.create).toHaveBeenCalledWith(
      expect.objectContaining({ file: expect.objectContaining({ data: input.data, name }) }),
    )
    expect(f.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 72,
        data: expect.objectContaining({ url, width: 1080, height: 1350 }),
      }),
    )
  })
  it('does not expose a storage provider error or token', async () => {
    const f = fixture({ id: 69, filename: `${name.slice(0, -5)}-300x375-random.webp` })
    vi.mocked(put).mockRejectedValue(new Error('private-storage-token'))
    await expect(uploadOriginalSocialMedia(f.req, input)).rejects.toMatchObject({
      code: 'social_original_upload_failed',
      message: 'social_original_upload_failed',
    })
    expect(f.payload.update).not.toHaveBeenCalled()
  })
})
