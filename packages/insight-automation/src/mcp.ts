import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  bufferStatusSchema,
  bufferUpdateDraftSchema,
  bufferDraftSchema,
  bufferListSchema,
  bufferScheduleSchema,
  bufferCancelSchema,
  articleSchema,
  getPostSchema,
  slugPlanSchema,
  slugApplySchema,
  categoryMergePlanSchema,
  categoryMergeApplySchema,
  categoryCreateSchema,
  categoryRenameSchema,
  postSelectorSchema,
  referenceSchema,
  sourceSchema,
  uploadSchema,
  updatePostSchema,
  schedulePostSchema,
  listSchedulesSchema,
  listPostsSchema,
  updateContentSchema,
  auditPostsSchema,
  type EditorialOperationInput,
} from './schema.ts'

export type EditorialBackend = {
  request(input: EditorialOperationInput): Promise<Record<string, unknown>>
}
export class InsightAuthorizationError extends Error {
  constructor(public challenge: string) {
    super('Insufficient OAuth permissions')
  }
}

export function createInsightMCPServer(backend: EditorialBackend): McpServer {
  const server = new McpServer(
    { name: 'trigenys-insight', version: '0.1.0' },
    { maxToolInputElements: 10000 },
  )
  const execute = async (input: EditorialOperationInput) => {
    try {
      const result = await backend.request(input)
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        structuredContent: result,
      }
    } catch (error) {
      return {
        isError: true,
        ...(error instanceof InsightAuthorizationError
          ? { _meta: { 'mcp/www_authenticate': [error.challenge] } }
          : {}),
        content: [
          {
            type: 'text' as const,
            text: error instanceof Error ? error.message : 'Request failed',
          },
        ],
      }
    }
  }
  const read = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  }
  const write = {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  }
  const oauth = (scopes: string[]) => ({ securitySchemes: [{ type: 'oauth2', scopes }] })

  server.registerTool(
    'insight_buffer_update_draft',
    {
      description:
        'Revise a draft on the same export and remote ID, or retry a definitive failed creation after remote reconciliation. Requires fresh exportId/expectedUpdatedAt, public postId, locale and reviewed text. socialMediaId selects a reviewed CMS banner for this article/locale/channel (1080x1350 PNG/JPEG/WebP, max 3 MiB, alt and public original file); required for legacy retries, otherwise omission preserves selection. To recover a failed known draft after external changes, supply expectedRemoteText and expectedRemoteImageURL (or null) from list_posts refresh; the server rereads and rejects stale reviews. Never publishes or schedules; refuses unknown outcomes and scheduled/sent posts. Confirm ID and media with list_posts.',
      inputSchema: bufferUpdateDraftSchema.shape,
      annotations: { ...write, destructiveHint: true, openWorldHint: true },
      _meta: oauth(['editorial:write']),
    },
    (input) => execute({ ...input, operation: 'buffer-update-draft' }),
  )
  server.registerTool(
    'insight_buffer_status',
    {
      description:
        'Check the server-side Buffer connection and list actual organizations/channels. Never returns the API key. First step before choosing a target social channel.',
      inputSchema: bufferStatusSchema.shape,
      annotations: { ...read, openWorldHint: true },
      _meta: oauth(['editorial:read']),
    },
    () => execute({ operation: 'buffer-status' }),
  )
  server.registerTool(
    'insight_buffer_create_draft',
    {
      description:
        'Prepare a Buffer draft from an already public translated article. Choose a live LinkedIn/Facebook channelId, platform-adapted text and stable idempotencyKey. Optional socialMediaId explicitly selects a reviewed CMS social banner for this article, locale and channel (1080x1350 PNG/JPEG/WebP, max 3 MiB, alt and public HTTPS URL); never modifies heroImage. Omission retains the legacy public-cover fallback for draft creation only; scheduling requires a reviewed social banner. Without text, uses a basic title/excerpt/UTM-link template. Uses the public version, never a private revision. Worker delivery creates only a draft, never schedules or publishes. Confirm remote ID and actual Buffer media through insight_buffer_list_posts.',
      inputSchema: bufferDraftSchema.shape,
      annotations: { ...write, destructiveHint: false, openWorldHint: true },
      _meta: oauth(['editorial:write']),
    },
    (input) => execute({ ...input, operation: 'buffer-create-draft' }),
  )
  server.registerTool(
    'insight_buffer_list_posts',
    {
      description:
        'List persisted social requests, confirmed Buffer IDs, selected socialAsset, confirmed bufferAssets, safe lastFailure diagnostics and timestamps. Status is the last observed response, not a delivery guarantee. Optional refresh:true (limit at most 6) reads current remote text, state and assets, or searches for an existing draft when the ID is missing, without modifying anything. Review remote before recovering external changes. Supports postId and pagination.',
      inputSchema: bufferListSchema.shape,
      annotations: read,
      _meta: oauth(['editorial:read']),
    },
    (input) => execute({ ...input, operation: 'buffer-list-posts' }),
  )
  server.registerTool(
    'insight_buffer_schedule_post',
    {
      description:
        'Schedule an existing confirmed Buffer draft for a user-approved explicit date/time. This authorizes future public social publication: call only when requested. Requires the export UUID and fresh expectedUpdatedAt from list_posts. publishAt must have an explicit UTC offset and be at least two minutes ahead. Reuses the remote draft ID, never creates another post. The minute worker checks remote text for unreviewed edits and confirms the Buffer schedule; read list_posts to verify.',
      inputSchema: bufferScheduleSchema.shape,
      annotations: { ...write, openWorldHint: true },
      _meta: oauth(['editorial:write', 'editorial:publish']),
    },
    (input) => execute({ ...input, operation: 'buffer-schedule-post' }),
  )
  server.registerTool(
    'insight_buffer_cancel_schedule',
    {
      description:
        'Request cancellation of a Buffer social schedule by returning the existing remote post to draft. Requires exportId and fresh expectedUpdatedAt. Cannot undo an already sent social post. Confirm the draft state through list_posts after the next worker tick.',
      inputSchema: bufferCancelSchema.shape,
      annotations: { ...write, openWorldHint: true },
      _meta: oauth(['editorial:write', 'editorial:publish']),
    },
    (input) => execute({ ...input, operation: 'buffer-cancel-schedule' }),
  )

  server.registerTool(
    'insight_list_categories',
    {
      _meta: oauth(['editorial:read']),
      description: 'List category IDs, localized titles, stable slugs and updatedAt timestamps. Use updatedAt as the expectedUpdatedAt guard for insight_rename_category.',
      inputSchema: referenceSchema.shape,
      annotations: read,
    },
    (input) => execute({ ...input, operation: 'list-categories' }),
  )
  server.registerTool(
    'insight_list_authors',
    {
      _meta: oauth(['editorial:read']),
      description:
        'List author IDs and public names. No credentials or email addresses are returned.',
      inputSchema: {},
      annotations: read,
    },
    () => execute({ operation: 'list-authors' }),
  )
  server.registerTool(
    'insight_get_post',
    {
      _meta: oauth(['editorial:read']),
      description:
        'Read an article by postId or idempotencyKey. version=latest (default) returns the latest saved revision, which may be a draft; version=published returns the actual published Payload snapshot rendered by the public site, even when a newer draft exists. The response identifies the version and returns publicPath for the published snapshot. Returns published_post_not_found if never published; does not fetch the page over HTTP. Read-only: never republishes or changes an article.',
      inputSchema: getPostSchema.shape,
      annotations: read,
    },
    (input) => execute({ ...input, operation: 'get-post' }),
  )
  server.registerTool(
    'insight_plan_slug_change',
    {
      _meta: oauth(['editorial:read']),
      description:
        'Read-only preview of renaming a post slug, including FR/EN/legacy URLs and any conflicts. A live article with a newer unpublished draft is BLOCKED to avoid publishing draft content. Never changes an article or URL. Use this before requesting explicit human approval.',
      inputSchema: slugPlanSchema.shape,
      annotations: read,
    },
    (input) => execute({ ...input, operation: 'plan-slug-change' }),
  )
  server.registerTool(
    'insight_apply_slug_change',
    {
      _meta: oauth(['editorial:write', 'editorial:publish']),
      description:
        'Change an article slug and atomically create permanent old-URL aliases to the SAME post. Only call after the user explicitly authorizes THIS exact post ID and new slug, and after a successful insight_plan_slug_change preview. Requires expectedSlug and expectedUpdatedAt from that preview and confirm=true; stale writes, conflicting slugs, scheduled posts, and live articles with divergent draft revisions are rejected. No article content is edited. Do NOT use for bulk renaming without individual approvals.',
      inputSchema: slugApplySchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'apply-slug-change' }),
  )
  server.registerTool(
    'insight_plan_category_merge',
    {
      _meta: oauth(['editorial:read']),
      description:
        'Pure read-only preview of merging two category IDs. Reports affected latest and published articles, duplicate relationships, nested child categories and editorial rubric conflicts. A legacy category may only be auto-merged into its matching canonical rubric; cross-rubric changes require editorial review. NEVER modifies article categories or deletes a category.',
      inputSchema: categoryMergePlanSchema.shape,
      annotations: read,
    },
    (input) => execute({ ...input, operation: 'plan-category-merge' }),
  )
  server.registerTool(
    'insight_create_category',
    {
      _meta: oauth(['editorial:write']),
      description:
        'Create ONE new category with a stable URL slug and both French/English titles. Requires explicit user approval (confirm=true); returns an existing category only if the slug and both titles match exactly. Canonical editorial rubrics are managed in the existing site setup. Never creates or reclassifies articles.',
      inputSchema: categoryCreateSchema.shape,
      annotations: { ...write, destructiveHint: false },
    },
    (input) => execute({ ...input, operation: 'create-category' }),
  )
  server.registerTool(
    'insight_rename_category',
    {
      _meta: oauth(['editorial:write']),
      description:
        'Rename French and English category titles on ONE existing category, atomically. Requires explicit user approval, categoryId, expectedUpdatedAt and confirm=true. Preserves category slug and all article relations. Canonical rubric titles are defined in code and cannot be changed here.',
      inputSchema: categoryRenameSchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'rename-category' }),
  )
  server.registerTool(
    'insight_apply_category_merge',
    {
      _meta: oauth(['editorial:write', 'editorial:publish']),
      description:
        'After explicit approval of a specific sourceId to targetId category pair, apply a matching fresh insight_plan_category_merge fingerprint to reassign current draft article relationships atomically. Preserves order, removes duplicates, does NOT publish or touch published article versions, and retains the source category for historical references. Refuses all merges involving published articles, nested categories, or unrelated rubrics. Never deletes a category.',
      inputSchema: categoryMergeApplySchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'apply-category-merge' }),
  )
  server.registerTool(
    'insight_update_post',
    {
      _meta: oauth(['editorial:write']),
      description:
        'Update selected title, excerpt, SEO description, category IDs, relatedPosts or explicit publication status on an existing article. Provide exactly one of postId or idempotencyKey. Categories replaces the category list; its first item is primary. relatedPosts replaces the ordered list of linked article IDs (max 12); [] clears it. Omitted fields and status are preserved. Related IDs must exist and cannot include the article itself. Never creates an article. Send expectedUpdatedAt from a recent get_post response to reject a stale edit. Set status only when the user requests a publication status change or restoration.',
      inputSchema: updatePostSchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'update-post' }),
  )
  server.registerTool(
    'insight_upload_media',
    {
      _meta: oauth(['editorial:write']),
      description:
        'Upload a PNG, JPEG or WebP image (max 3 MiB) from base64 with meaningful alt text. Reuse the returned media ID in heroImage or image markers.',
      inputSchema: uploadSchema.shape,
      annotations: { ...write, destructiveHint: false },
    },
    (input) => execute({ ...input, operation: 'upload-media' }),
  )
  server.registerTool(
    'insight_upsert_source',
    {
      _meta: oauth(['editorial:write']),
      description:
        'Create or update a traceable research source by HTTPS URL. Returns its ID for the article sources array.',
      inputSchema: sourceSchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'upsert-source' }),
  )
  server.registerTool(
    'insight_create_draft',
    {
      _meta: oauth(['editorial:write']),
      description:
        'Create or revise a draft. Body supports ## headings, HTTPS Markdown links, bold and italics. Put [[CHART:name]] and [[IMAGE:name]] markers in separate paragraphs and provide their definitions. relatedPosts selects an ordered list of existing linked article IDs (max 12); [] clears the list, omission preserves it. Use the same idempotencyKey across revisions and translations. Prefer this tool unless publication was explicitly requested.',
      inputSchema: articleSchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'draft' }),
  )
  server.registerTool(
    'insight_publish',
    {
      _meta: oauth(['editorial:write', 'editorial:publish']),
      description:
        'Publish an article immediately, making it public. Call only when the user explicitly asks to publish. Send the complete article and the same idempotencyKey used for its draft. relatedPosts selects existing linked article IDs in display order (max 12); omission preserves the selection, [] clears it. Publishing status is shared across FR/EN; create both translations as drafts before publishing.',
      inputSchema: articleSchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'publish' }),
  )
  server.registerTool(
    'insight_schedule_post',
    {
      _meta: oauth(['editorial:write', 'editorial:publish']),
      description:
        'Schedule an existing draft for future publication, or replace its pending publication date. Provide exactly one postId or idempotencyKey, publishAt as ISO 8601 with an explicit UTC offset, and the IANA timeZone (default Africa/Douala). Ask for a date if none was specified. Does not publish immediately or change content. Publishes the latest saved draft and the shared FR/EN publication status. Cloudflare wakes the worker at the requested deadline, with hourly recovery if notification fails; execution may be delayed. An already published article is rejected. Use expectedUpdatedAt to reject stale edits.',
      inputSchema: schedulePostSchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'schedule-post' }),
  )
  server.registerTool(
    'insight_cancel_schedule',
    {
      _meta: oauth(['editorial:write', 'editorial:publish']),
      description:
        'Cancel all pending publication jobs for an article without changing its content or publication status. Provide exactly one postId or idempotencyKey. A publication already processing cannot be cancelled.',
      inputSchema: postSelectorSchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'cancel-schedule' }),
  )
  server.registerTool(
    'insight_list_schedules',
    {
      _meta: oauth(['editorial:read']),
      description:
        'List pending, processing and failed article publication jobs, including schedules made in the CMS. Dates are UTC; convert to the requested local time zone for display. Cancelled and completed jobs are excluded. Paginate with page and limit.',
      inputSchema: listSchedulesSchema.shape,
      annotations: read,
    },
    (input) => execute({ ...input, operation: 'list-schedules' }),
  )
  server.registerTool(
    'insight_list_posts',
    {
      _meta: oauth(['editorial:read']),
      description:
        'List article summaries with exact filtered totals and pagination. Filter by latest saved status, locale, categoryId, heroImage (missing/present), title search or publication date range. No locale fallback: translationPresent reports whether that locale has a title and body. status is the latest saved version; isPublic separately reports whether a published version is live. Use totalDocs to count matches (for example missing covers); request following pages while hasNextPage. Does not return full bodies or edit content.',
      inputSchema: listPostsSchema.shape,
      annotations: read,
    },
    (input) => execute({ ...input, operation: 'list-posts' }),
  )
  server.registerTool(
    'insight_update_content',
    {
      _meta: oauth(['editorial:write', 'editorial:publish']),
      description:
        'Replace the complete body of any existing article by postId, preserving its slug, publication status, pending schedule and omitted fields. Read get_post first and send its expectedUpdatedAt; a stale edit is rejected. Published content changes become public immediately. Body uses Markdown plus separate CHART/IMAGE markers with definitions. To keep an existing embedded block, put [[BLOCK:name]] in a separate paragraph and pass retainedBlocks with its fields.id from get_post. Removing or rebuilding any old embedded block requires allowBlockRemoval:true; set that only when the user requested the block change. Optional fields can update title, excerpt, SEO, heroImage (null clears it), sources, relatedPosts, authors/categories, FAQ and keyTakeaways. Raw rich-text JSON is not accepted. Only the requested locale is rewritten; shared fields such as heroImage and categories affect both languages.',
      inputSchema: updateContentSchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'update-content' }),
  )
  server.registerTool(
    'insight_audit_posts',
    {
      _meta: oauth(['editorial:read']),
      description:
        'Read-only, paginated technical audit of articles and both FR/EN versions, without locale fallback. Supports list_posts filters, optional postIds and selected checks: translations, SEO, sources, images, links and structure. Reports missing translations/covers/alt text, unresolved markers, invalid chart data, missing references and links to absent or unpublished CMS articles. No HTTP links are fetched: external availability, factual accuracy, source credibility and editorial quality are NOT verified. SEO length warnings are heuristics. passesAutomatedChecks only means no detected technical errors, never editorial approval. Summaries cover the current page; follow hasNextPage for a complete audit. Does not modify, publish or schedule anything.',
      inputSchema: auditPostsSchema.shape,
      annotations: read,
    },
    (input) => execute({ ...input, operation: 'audit-posts' }),
  )
  return server
}
