// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { canTrashPost } from '@/access/canTrashPost'

describe('irreversible Payload delete protection', () => {
  it('permits authenticated soft-delete', () => {
    expect(canTrashPost({
      user: { id: 9 },
      data: { deletedAt: '2026-11-02T09:00:00.000Z' },
    })).toBe(true)
  })
  it('permits authenticated native restore with a cleared deletedAt field', () => {
    expect(canTrashPost({ user: { id: 9 }, data: { deletedAt: null } })).toBe(true)
  })
  it('rejects permanent delete for every authenticated editor', () => {
    expect(canTrashPost({ user: { id: 9 }, data: undefined })).toBe(false)
    expect(canTrashPost({ user: { id: 9 }, data: {} })).toBe(false)
  })
  it('rejects unauthenticated trash or restore attempts', () => {
    expect(canTrashPost({ user: null, data: { deletedAt: new Date().toISOString() } })).toBe(false)
    expect(canTrashPost({ user: null, data: { deletedAt: null } })).toBe(false)
  })
})
