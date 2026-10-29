import {
  operationSchema,
  validateMarkers,
  type ArticleInput,
  type EditorialOperationInput,
  type UploadInput,
  type SourceInput,
  type PublicationResult,
  type MediaResult,
  type ReferenceResult,
  type PostResult,
  type SlugPlanInput,
  type SlugApplyInput,
  type SlugPlanResult,
  type SlugApplyResult,
  type ArchivePlanInput,
  type ArchivePostInput,
  type RestorePostInput,
  type ArchivePlanResult,
  type ArchiveResult,
  type UpdatePostInput,
  type UpdatePostResult,
  type SchedulePostInput,
  type PostSelector,
  type ScheduleResult,
  type SchedulesResult,
  type ListPostsInput,
  type ListPostsResult,
  type UpdateContentInput,
  type AuditPostsInput,
  type AuditPostsResult,
  type BufferDraftInput,
  type BufferUpdateDraftInput,
  type BufferListInput,
  type BufferScheduleInput,
  type BufferCancelInput,
} from './schema.ts'
export * from './schema.ts'

export class InsightAPIError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(`Trigenys Insight: ${code} (HTTP ${status})`)
    this.name = 'InsightAPIError'
  }
}

export class InsightClient {
  private readonly endpoint: string
  private readonly fetcher: typeof fetch
  private readonly token: string | undefined
  private readonly credentials: RequestCredentials
  private readonly timeoutMs: number

  constructor(options: {
    baseURL: string
    token?: string
    session?: boolean
    fetch?: typeof fetch
    timeoutMs?: number
  }) {
    const url = new URL(options.baseURL)
    if (
      url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    ) {
      throw new Error('Use HTTPS, or HTTP on localhost for development')
    }
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== '/' && url.pathname !== '')
    ) {
      throw new Error('baseURL must be an origin without credentials, path, query or fragment')
    }
    if (!options.token?.trim() && !options.session)
      throw new Error('A publishing token or editorial session is required')
    if (
      options.session &&
      (typeof window === 'undefined' || url.origin !== window.location.origin)
    ) {
      throw new Error('Session authentication is only available in a same-origin browser')
    }
    this.credentials = options.session ? 'same-origin' : 'omit'
    this.endpoint = `${url.origin}/api/editorial-os`
    this.fetcher = options.fetch ?? fetch.bind(globalThis)
    this.token = options.token
    this.timeoutMs = options.timeoutMs ?? 30000
  }

  async request<T = Record<string, unknown>>(input: EditorialOperationInput): Promise<T> {
    const parsed = operationSchema.parse(input)
    if (parsed.operation === 'draft' || parsed.operation === 'publish') {
      const errors = validateMarkers(parsed)
      if (errors.length) throw new Error(errors.join('; '))
    }
    const response = await this.fetcher(this.endpoint, {
      method: 'POST',
      redirect: 'error',
      credentials: this.credentials,
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(parsed),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      const code = result && typeof result.error === 'string' ? result.error : 'request_failed'
      throw new InsightAPIError(response.status, code)
    }
    if (!result || result.ok !== true)
      throw new InsightAPIError(response.status, 'invalid_response')
    return result as T
  }

  createDraft(input: ArticleInput) {
    return this.request<PublicationResult>({ ...input, operation: 'draft' })
  }
  publish(input: ArticleInput) {
    return this.request<PublicationResult>({ ...input, operation: 'publish' })
  }
  uploadMedia(input: UploadInput) {
    return this.request<MediaResult>({ ...input, operation: 'upload-media' })
  }
  upsertSource(input: SourceInput) {
    return this.request<{ ok: true; id: number }>({ ...input, operation: 'upsert-source' })
  }
  getPost(idempotencyKey: string, locale: 'fr' | 'en' = 'fr', version: 'latest' | 'published' = 'latest') {
    return this.request<PostResult>({ operation: 'get-post', idempotencyKey, locale, version })
  }
  planSlugChange(input: SlugPlanInput) {
    return this.request<SlugPlanResult>({ ...input, operation: 'plan-slug-change' })
  }
  applySlugChange(input: SlugApplyInput) {
    return this.request<SlugApplyResult>({ ...input, operation: 'apply-slug-change' })
  }
  planPostArchive(input: ArchivePlanInput) {
    return this.request<ArchivePlanResult>({ ...input, operation: 'plan-post-archive' })
  }
  archivePost(input: ArchivePostInput) {
    return this.request<ArchiveResult>({ ...input, operation: 'archive-post' })
  }
  restorePost(input: RestorePostInput) {
    return this.request<ArchiveResult>({ ...input, operation: 'restore-post' })
  }
  updatePost(input: UpdatePostInput) {
    return this.request<UpdatePostResult>({ ...input, operation: 'update-post' })
  }
  getPostById(postId: number, locale: 'fr' | 'en' = 'fr', version: 'latest' | 'published' = 'latest') {
    return this.request<PostResult>({ operation: 'get-post', postId, locale, version })
  }
  bufferUpdateDraft(input: BufferUpdateDraftInput) {
    return this.request({ ...input, operation: 'buffer-update-draft' })
  }
  bufferStatus() {
    return this.request({ operation: 'buffer-status' })
  }
  bufferCreateDraft(input: BufferDraftInput) {
    return this.request({ ...input, operation: 'buffer-create-draft' })
  }
  bufferListPosts(input: BufferListInput = {}) {
    return this.request({ ...input, operation: 'buffer-list-posts' })
  }
  bufferSchedulePost(input: BufferScheduleInput) {
    return this.request({ ...input, operation: 'buffer-schedule-post' })
  }
  bufferCancelSchedule(input: BufferCancelInput) {
    return this.request({ ...input, operation: 'buffer-cancel-schedule' })
  }
  listCategories(locale: 'fr' | 'en' = 'fr') {
    return this.request<ReferenceResult>({ operation: 'list-categories', locale })
  }
  listAuthors() {
    return this.request<ReferenceResult>({ operation: 'list-authors' })
  }
  schedulePost(input: SchedulePostInput) {
    return this.request<ScheduleResult>({ ...input, operation: 'schedule-post' })
  }
  cancelSchedule(input: PostSelector) {
    return this.request<{ ok: true; postId: number; cancelled: number }>({
      ...input,
      operation: 'cancel-schedule',
    })
  }
  listSchedules(input: { postId?: number; limit?: number; page?: number } = {}) {
    return this.request<SchedulesResult>({ ...input, operation: 'list-schedules' })
  }
  listPosts(input: ListPostsInput = {}) {
    return this.request<ListPostsResult>({ ...input, operation: 'list-posts' })
  }
  updateContent(input: UpdateContentInput) {
    return this.request<UpdatePostResult>({ ...input, operation: 'update-content' })
  }
  auditPosts(input: AuditPostsInput = {}) {
    return this.request<AuditPostsResult>({ ...input, operation: 'audit-posts' })
  }
}
