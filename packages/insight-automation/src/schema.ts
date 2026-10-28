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
    relatedPosts: z.array(id).max(12).optional(),
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

export function validateMarkers(input: Pick<ArticleInput, 'body' | 'charts' | 'images'>): string[] {
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
    relatedPosts: z.array(id).max(12).optional(),
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
  relatedPosts: number[]
}

export const referenceSchema = z.object({ locale: locale.default('fr') }).strict()

export const listPostsSchema = z
  .object({
    locale: locale.default('fr'),
    status: z.enum(['ANY', 'DRAFT', 'PUBLISHED']).default('ANY'),
    categoryId: id.optional(),
    heroImage: z.enum(['any', 'missing', 'present']).default('any'),
    search: text.max(200).optional(),
    publishedAfter: z.string().datetime({ offset: true }).optional(),
    publishedBefore: z.string().datetime({ offset: true }).optional(),
    sort: z
      .enum([
        'id',
        '-id',
        'updatedAt',
        '-updatedAt',
        'createdAt',
        '-createdAt',
        'publishedAt',
        '-publishedAt',
      ])
      .default('-updatedAt'),
    page: id.default(1),
    limit: id.max(100).default(25),
  })
  .strict()
export const updateContentSchema = articleSchema
  .omit({ idempotencyKey: true, ownerKey: true, target: true })
  .partial()
  .extend({
    postId: id,
    locale: locale.default('fr'),
    body: text.max(200000),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    heroImage: id.nullable().optional(),
    retainedBlocks: z
      .array(
        z
          .object({ marker: text.regex(/^\[\[BLOCK:[a-zA-Z0-9_-]+\]\]$/), blockId: text.max(100) })
          .strict(),
      )
      .max(100)
      .optional(),
    allowBlockRemoval: z.boolean().default(false),
  })
  .strict()
export const auditPostsSchema = listPostsSchema
  .extend({
    limit: id.max(50).default(20),
    postIds: z.array(id).min(1).max(100).optional(),
    checks: z
      .array(z.enum(['translations', 'seo', 'sources', 'images', 'links', 'structure']))
      .min(1)
      .max(6)
      .default(['translations', 'seo', 'sources', 'images', 'links', 'structure']),
  })
  .strict()
export type ListPostsInput = z.input<typeof listPostsSchema>
export type UpdateContentInput = z.input<typeof updateContentSchema>
export type AuditPostsInput = z.input<typeof auditPostsSchema>
export type PostSummary = {
  id: number
  slug: string
  title: string | null
  excerpt: string | null
  status: 'DRAFT' | 'PUBLISHED'
  isPublic: boolean
  heroImage: number | null
  categories: number[]
  authors: number[]
  updatedAt: string
  publishedAt: string | null
  hasContent: boolean
  translationPresent: boolean
  wordCount: number
}
export type ListPostsResult = {
  ok: true
  locale: 'fr' | 'en'
  view: 'latest'
  docs: PostSummary[]
  totalDocs: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
}
export type AuditIssue = {
  code: string
  severity: 'error' | 'warning'
  field: string
  locale?: 'fr' | 'en'
  message: string
}
export type AuditPostsResult = {
  ok: true
  checkedAt: string
  scope: 'current_page'
  editorialApprovalRequired: true
  externalAvailabilityChecked: false
  factsVerified: false
  totalDocs: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  summary: {
    scanned: number
    articlesWithErrors: number
    articlesWithWarnings: number
    issuesByCode: Record<string, number>
  }
  docs: Array<{
    id: number
    slug: string
    title: string | null
    status: 'DRAFT' | 'PUBLISHED'
    isPublic: boolean
    passesAutomatedChecks: boolean
    issues: AuditIssue[]
    locales: Record<'fr' | 'en', { hasTitle: boolean; hasContent: boolean; wordCount: number }>
  }>
}

export const schedulePostSchema = getPostSchema
  .extend({
    publishAt: z.string().datetime({ offset: true }),
    timeZone: text
      .max(100)
      .default('Africa/Douala')
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('fr', { timeZone: value })
          return true
        } catch {
          return false
        }
      }, 'Use an IANA time zone, e.g. Africa/Douala'),
    expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
export const listSchedulesSchema = z
  .object({ postId: id.optional(), limit: id.max(100).default(50), page: id.default(1) })
  .strict()
export type SchedulePostInput = z.input<typeof schedulePostSchema>
export type PostSelector = z.input<typeof getPostSchema>
export type ScheduleResult = {
  ok: true
  postId: number
  jobId: number
  publishAt: string
  timeZone: string
  status: 'SCHEDULED'
}
export type SchedulesResult = {
  ok: true
  docs: Array<{
    jobId: number
    postId: number
    publishAt: string | null
    status: 'SCHEDULED' | 'PROCESSING' | 'FAILED'
  }>
  totalDocs: number
  hasNextPage: boolean
}

export const bufferStatusSchema = z.object({}).strict()
export const bufferDraftSchema = z
  .object({
    postId: id,
    locale: locale.default('fr'),
    channelId: text.max(200),
    idempotencyKey: text.max(200),
    text: text.max(3000).optional(),
    socialMediaId: id.optional(),
  })
  .strict()
export const bufferListSchema = z
  .object({ postId: id.optional(), page: id.default(1), limit: id.max(100).default(25) })
  .strict()
export const bufferScheduleSchema = z
  .object({
    exportId: z.string().uuid(),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    publishAt: z.string().datetime({ offset: true }),
  })
  .strict()
export const bufferUpdateDraftSchema = z
  .object({
    exportId: z.string().uuid(),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    postId: id,
    locale: locale.default('fr'),
    text: text.max(3000),
    socialMediaId: id.optional(),
  })
  .strict()
export type BufferUpdateDraftInput = z.input<typeof bufferUpdateDraftSchema>
export const bufferCancelSchema = bufferScheduleSchema.omit({ publishAt: true })
export type BufferDraftInput = z.input<typeof bufferDraftSchema>
export type BufferListInput = z.input<typeof bufferListSchema>
export type BufferScheduleInput = z.input<typeof bufferScheduleSchema>
export type BufferCancelInput = z.input<typeof bufferCancelSchema>

export const operationSchema = z.discriminatedUnion('operation', [
  bufferUpdateDraftSchema.extend({ operation: z.literal('buffer-update-draft') }),
  bufferStatusSchema.extend({ operation: z.literal('buffer-status') }),
  bufferDraftSchema.extend({ operation: z.literal('buffer-create-draft') }),
  bufferListSchema.extend({ operation: z.literal('buffer-list-posts') }),
  bufferScheduleSchema.extend({ operation: z.literal('buffer-schedule-post') }),
  bufferCancelSchema.extend({ operation: z.literal('buffer-cancel-schedule') }),
  articleSchema.extend({ operation: z.literal('draft') }),
  articleSchema.extend({ operation: z.literal('publish') }),
  uploadSchema.extend({ operation: z.literal('upload-media') }),
  sourceSchema.extend({ operation: z.literal('upsert-source') }),
  getPostSchema.extend({ operation: z.literal('get-post') }),
  updatePostSchema.extend({ operation: z.literal('update-post') }),
  schedulePostSchema.extend({ operation: z.literal('schedule-post') }),
  getPostSchema.extend({ operation: z.literal('cancel-schedule') }),
  listSchedulesSchema.extend({ operation: z.literal('list-schedules') }),
  listPostsSchema.extend({ operation: z.literal('list-posts') }),
  updateContentSchema.extend({ operation: z.literal('update-content') }),
  auditPostsSchema.extend({ operation: z.literal('audit-posts') }),
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
