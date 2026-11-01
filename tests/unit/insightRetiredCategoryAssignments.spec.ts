// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { guardRetiredCategories } from '@/collections/Posts/hooks/guardRetiredCategories'

function fixture(
  originalCategories: number[],
  incomingCategories: number[] | undefined,
  retiredIds: number[],
) {
  const find = vi.fn(async (args: {
    collection: string
    where: { and: Array<{ id?: { in: number[] }; retiredAt?: { exists: boolean } }> }
  }) => {
    expect(args.collection).toBe('categories')
    expect(args.where.and[1]).toEqual({ retiredAt: { exists: true } })
    const ids = args.where.and[0]?.id?.in ?? []
    const docs = ids.filter((id) => retiredIds.includes(id)).map((id) => ({ id }))
    return { docs, totalDocs: docs.length }
  })
  const req = { payload: { find } } as unknown as PayloadRequest
  const data = incomingCategories === undefined ? { title: 'Updated headline' }
    : { categories: incomingCategories, title: 'Updated headline' }
  const originalDoc = { id: 50, categories: originalCategories }
  return { req, data, originalDoc, find }
}

async function validate(input: ReturnType<typeof fixture>) {
  return guardRetiredCategories({
    req: input.req,
    data: input.data,
    originalDoc: input.originalDoc,
    operation: 'update',
    context: {},
    collection: { slug: 'posts' },
  } as Parameters<typeof guardRetiredCategories>[0])
}

describe('Payload retired category assignment protection', () => {
  it('allows unrelated updates without querying categories', async () => {
    const input = fixture([4], undefined, [4])
    await expect(validate(input)).resolves.toEqual(input.data)
    expect(input.find).not.toHaveBeenCalled()
  })
  it('preserves historical retired links already on the article', async () => {
    const input = fixture([1, 7], [1, 7], [1])
    await expect(validate(input)).resolves.toEqual(input.data)
    expect(input.find).not.toHaveBeenCalled()
  })
  it('allows removing retired links and adding active categories', async () => {
    const input = fixture([1, 7], [7, 9], [1])
    await expect(validate(input)).resolves.toEqual(input.data)
    expect(input.find).toHaveBeenCalledOnce()
    expect(input.find.mock.calls[0][0].where.and[0]).toEqual({ id: { in: [9] } })
  })
  it('rejects newly assigned retired category through the Payload API', async () => {
    const input = fixture([7], [7, 1], [1])
    await expect(validate(input)).rejects.toMatchObject({
      status: 422,
      message: 'retired_category_cannot_be_assigned',
    })
    expect(input.find).toHaveBeenCalledOnce()
  })
  it('also checks all selected categories when creating an article', async () => {
    const input = fixture([], [7, 1], [1])
    await expect(validate(input)).rejects.toMatchObject({ status: 422 })
  })
  it('deduplicates repeated category IDs before checking', async () => {
    const input = fixture([7], [7, 1, 1], [])
    await expect(validate(input)).resolves.toEqual(input.data)
    expect(input.find.mock.calls[0][0].where.and[0]).toEqual({ id: { in: [1] } })
  })
})
