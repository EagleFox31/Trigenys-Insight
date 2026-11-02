// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { PayloadRequest } from 'payload'
import {
  guardCategoryRetirementMetadata,
  RETIREMENT_CONTEXT_KEY,
} from '@/collections/categoryRetirementGuard'

const time = '2026-10-30T09:00:00.000Z'
const call = async (incoming: string | null | undefined, original: string | null, trusted = false) => {
  const data = incoming === undefined ? { title: 'Renamed category' } : {
    title: 'Renamed category', retiredAt: incoming,
  }
  const req = {
    context: trusted ? { [RETIREMENT_CONTEXT_KEY]: true } : {},
  } as unknown as PayloadRequest
  return guardCategoryRetirementMetadata({
    data, originalDoc: { id: 6, retiredAt: original },
    req, operation: 'update', context: {},
    collection: { slug: 'categories' },
  } as Parameters<typeof guardCategoryRetirementMetadata>[0])
}

describe('category retirement flag write protection', () => {
  it('permits ordinary changes without the retirement field', async () => {
    await expect(call(undefined, time)).resolves.toMatchObject({ title: 'Renamed category' })
  })
  it('permits re-sending the unchanged retirement timestamp', async () => {
    await expect(call(time, time)).resolves.toMatchObject({ retiredAt: time })
    await expect(call(null, null)).resolves.toMatchObject({ retiredAt: null })
  })
  it('rejects direct Payload REST-style retire requests', async () => {
    await expect(call(time, null)).rejects.toMatchObject({
      status: 403, message: 'category_retirement_requires_reviewed_workflow',
    })
  })
  it('rejects direct Payload REST-style restore requests', async () => {
    await expect(call(null, time)).rejects.toMatchObject({ status: 403 })
  })
  it('allows changes only with the trusted server workflow context', async () => {
    await expect(call(time, null, true)).resolves.toMatchObject({ retiredAt: time })
    await expect(call(null, time, true)).resolves.toMatchObject({ retiredAt: null })
  })
})
