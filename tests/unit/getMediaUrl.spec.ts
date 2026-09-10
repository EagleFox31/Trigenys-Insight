import { describe, expect, it } from 'vitest'

import { getMediaUrl } from '@/utilities/getMediaUrl'

describe('getMediaUrl', () => {
  it('adds a named cache parameter to a URL without query parameters', () => {
    expect(getMediaUrl('/media/hero.png', '2026-09-10T20:46:34.964Z')).toBe(
      '/media/hero.png?v=2026-09-10T20%3A46%3A34.964Z',
    )
  })

  it('preserves the Payload Blob prefix query parameter', () => {
    expect(getMediaUrl('/api/media/file/hero.png?prefix=media', '2026-09-10T20:46:34.964Z')).toBe(
      '/api/media/file/hero.png?prefix=media&v=2026-09-10T20%3A46%3A34.964Z',
    )
  })

  it('preserves URL fragments', () => {
    expect(getMediaUrl('/media/hero.svg#preview', 'revision')).toBe(
      '/media/hero.svg?v=revision#preview',
    )
  })

  it('returns an empty string when no URL is provided', () => {
    expect(getMediaUrl(undefined, 'revision')).toBe('')
  })
})
