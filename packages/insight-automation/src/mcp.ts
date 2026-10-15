import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  articleSchema,
  getPostSchema,
  referenceSchema,
  sourceSchema,
  uploadSchema,
  updatePostSchema,
  schedulePostSchema,
  listSchedulesSchema,
  type EditorialOperationInput,
} from './schema.ts'

export type EditorialBackend = {
  request(input: EditorialOperationInput): Promise<Record<string, unknown>>
}
export class InsightAuthorizationError extends Error {
  constructor(public challenge: string) { super('Insufficient OAuth permissions') }
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
        ...(error instanceof InsightAuthorizationError ? { _meta: { 'mcp/www_authenticate': [error.challenge] } } : {}),
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
    'insight_list_categories',
    {
      _meta: oauth(['editorial:read']),
      description: 'List available editorial category IDs and names.',
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
        'Read an existing article, including draft content. Provide exactly one identifier: postId for any CMS article, or idempotencyKey for an automation article.',
      inputSchema: getPostSchema.shape,
      annotations: read,
    },
    (input) => execute({ ...input, operation: 'get-post' }),
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
  server.registerTool('insight_schedule_post', {
    _meta: oauth(['editorial:write', 'editorial:publish']),
    description: 'Schedule an existing draft for future publication, or replace its pending publication date. Provide exactly one postId or idempotencyKey, publishAt as ISO 8601 with an explicit UTC offset, and the IANA timeZone (default Africa/Douala). Ask for a date if none was specified. Does not publish immediately or change content. Publishes the latest saved draft and the shared FR/EN publication status. The worker checks about every 5 minutes; execution may be delayed. An already published article is rejected. Use expectedUpdatedAt to reject stale edits.',
    inputSchema: schedulePostSchema.shape,
    annotations: write,
  }, (input) => execute({ ...input, operation: 'schedule-post' }))
  server.registerTool('insight_cancel_schedule', {
    _meta: oauth(['editorial:write', 'editorial:publish']),
    description: 'Cancel all pending publication jobs for an article without changing its content or publication status. Provide exactly one postId or idempotencyKey. A publication already processing cannot be cancelled.',
    inputSchema: getPostSchema.shape,
    annotations: write,
  }, (input) => execute({ ...input, operation: 'cancel-schedule' }))
  server.registerTool('insight_list_schedules', {
    _meta: oauth(['editorial:read']),
    description: 'List pending, processing and failed article publication jobs, including schedules made in the CMS. Dates are UTC; convert to the requested local time zone for display. Cancelled and completed jobs are excluded. Paginate with page and limit.',
    inputSchema: listSchedulesSchema.shape,
    annotations: read,
  }, (input) => execute({ ...input, operation: 'list-schedules' }))
  return server
}
