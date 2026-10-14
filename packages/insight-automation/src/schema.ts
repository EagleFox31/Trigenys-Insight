import { z } from 'zod'

const text = z.string().trim().min(1)
const id = z.number().int().positive()
const locale = z.enum(['fr', 'en'])
const httpsURL = z
  .string()
  .url()
  .refine((value) => value.startsWith('https://'), 'Use an HTTPS URL')
const marker = text.max(120).regex(/^\[\[(?:CHART|IMAGE):[a-zA-Z0-9_-]+\]\]$/)
export const chartSchema = z
  .object({
    marker,
    title: text.max(300),
    description: text.max(2000),
    sourceLabel: text.max(500),
    sourceUrl: httpsURL,
    metrics: z
      .array(
        z
          .object({
            label: text.max(200),
            unit: z.string().max(80),
            precision: z.number().int().min(0).max(2).default(1),
            points: z
              .array(z.object({ label: text.max(200), value: z.number().finite() }).strict())
              .min(2)
              .max(12),
          })
          .strict(),
      )
      .min(1)
      .max(5),
  })
  .strict()

export const articleSchema = z
  .object({
    idempotencyKey: text.max(200),
    ownerKey: text.max(200),
    target: text.max(200),
    locale,
    title: text.max(500),
    excerpt: text.max(320).nullable().optional(),
    body: text.max(200000),
    authors: z.array(id).min(1).max(10).optional(),
    categories: z.array(id).min(1).max(10).optional(),
    heroImage: id.optional(),
    images: z
      .array(z.object({ marker, media: id }).strict())
      .max(30)
      .optional(),
    charts: z.array(chartSchema).max(20).optional(),
    sources: z.array(id).max(100).optional(),
    kind: z.enum(['analysis', 'guide', 'comparison', 'field-note']).optional(),
    readingTime: z.number().int().min(1).max(300).optional(),
    featured: z.boolean().optional(),
    editorsPick: z.boolean().optional(),
    keyTakeaways: z
      .array(z.object({ text: text.max(280) }).strict())
      .max(5)
      .optional(),
    faq: z
      .array(z.object({ question: text.max(200), answer: text.max(800) }).strict())
      .max(8)
      .optional(),
    metadata: z
      .object({
        seo: z
          .object({
            title: text.max(300).optional(),
            description: text.max(500).optional(),
            metaTitle: text.max(300).optional(),
            metaDescription: text.max(500).optional(),
            image: id.optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .strict()

export function validateMarkers(input: ArticleInput): string[] {
  const definitions = [...(input.charts ?? []), ...(input.images ?? [])]
  const markers = definitions.map((item) => item.marker)
  const blocks = input.body
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
  const errors: string[] = []
  if (new Set(markers).size !== markers.length)
    errors.push('Chart and image markers must be unique')
  for (const value of markers) {
    if (blocks.filter((block) => block === value).length !== 1) {
      errors.push(`${value} must appear exactly once as a separate paragraph`)
    }
  }
  for (const match of input.body.matchAll(/\[\[(?:CHART|IMAGE):[a-zA-Z0-9_-]+\]\]/g)) {
    if (!markers.includes(match[0])) errors.push(`Missing definition for ${match[0]}`)
  }
  return errors
}

export const uploadSchema = z
  .object({
    filename: text.max(180).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(png|jpg|jpeg|webp)$/i),
    mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
    alt: text.max(1000),
    // 3 MiB of bytes leaves room below the Vercel request limit after base64 encoding.
    dataBase64: text
      .max(4 * 1024 * 1024)
      .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
  })
  .strict()
export const sourceSchema = z
  .object({
    title: text.max(500),
    publisher: text.max(300).optional(),
    url: httpsURL,
    publishedAt: z.string().datetime({ offset: true }).optional(),
    accessedAt: z.string().datetime({ offset: true }),
    language: z.enum(['fr', 'en', 'other']).default('fr'),
    notes: z.string().max(10000).optional(),
  })
  .strict()
export const getPostSchema = z
  .object({
    idempotencyKey: text.max(200).optional(),
    postId: id.optional(),
    locale: locale.default('fr'),
  })
  .strict()
export const updatePostSchema = getPostSchema
  .extend({
    title: text.max(500).optional(),
    excerpt: text.max(320).optional(),
    seoDescription: text.max(500).optional(),
    categories: z.array(id).min(1).max(10).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
export type UpdatePostInput = z.input<typeof updatePostSchema>
export type UpdatePostResult = {
  ok: true
  id: number
  slug: string
  status: 'DRAFT' | 'PUBLISHED'
  updatedAt: string
  url: string | null
}

export const referenceSchema = z.object({ locale: locale.default('fr') }).strict()

export const operationSchema = z.discriminatedUnion('operation', [
  articleSchema.extend({ operation: z.literal('draft') }),
  articleSchema.extend({ operation: z.literal('publish') }),
  uploadSchema.extend({ operation: z.literal('upload-media') }),
  sourceSchema.extend({ operation: z.literal('upsert-source') }),
  getPostSchema.extend({ operation: z.literal('get-post') }),
  updatePostSchema.extend({ operation: z.literal('update-post') }),
  referenceSchema.extend({ operation: z.literal('list-categories') }),
  referenceSchema.extend({ operation: z.literal('list-authors') }),
])
export type ArticleInput = z.input<typeof articleSchema>
export type UploadInput = z.input<typeof uploadSchema>
export type EditorialOperation = z.output<typeof operationSchema>
export type EditorialOperationInput = z.input<typeof operationSchema>
export type PublicationResult = {
  ok: true
  id: number
  slug: string
  status: 'DRAFT' | 'PUBLISHED'
  url: string | null
  previewURL: string | null
  adminURL: string
  ownerKey: string
  target: string
}
export type MediaResult = { ok: true; id: number; url: string | null; reused: boolean }
export type ReferenceResult = {
  ok: true
  docs: Array<{ id: number; title?: string; slug?: string; name?: string }>
}
export type PostResult = { ok: true; post: Record<string, unknown> }

export type SourceInput = z.input<typeof sourceSchema>
