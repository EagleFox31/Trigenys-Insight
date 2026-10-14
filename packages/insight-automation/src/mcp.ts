import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  articleSchema,
  getPostSchema,
  referenceSchema,
  sourceSchema,
  uploadSchema,
  updatePostSchema,
  type EditorialOperationInput,
} from './schema.ts'

export type EditorialBackend = {
  request(input: EditorialOperationInput): Promise<Record<string, unknown>>
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
  server.registerTool(
    'insight_list_categories',
    {
      description: 'List available editorial category IDs and names.',
      inputSchema: referenceSchema.shape,
      annotations: read,
    },
    (input) => execute({ ...input, operation: 'list-categories' }),
  )
  server.registerTool(
    'insight_list_authors',
    {
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
      description:
        'Read an automation article by its stable idempotency key, including its draft content.',
      inputSchema: getPostSchema.shape,
      annotations: read,
    },
    (input) => execute({ ...input, operation: 'get-post' }),
  )
  server.registerTool(
    'insight_update_post',
    {
      description:
        'Update only the title, excerpt or SEO description of an existing automation article. Omitted fields, rich content, media, sources and publication status are preserved. Never creates an article. Send expectedUpdatedAt from a recent get_post response to reject a stale edit.',
      inputSchema: updatePostSchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'update-post' }),
  )
  server.registerTool(
    'insight_upload_media',
    {
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
      description:
        'Create or revise a draft. Body supports ## headings, HTTPS Markdown links, bold and italics. Put [[CHART:name]] and [[IMAGE:name]] markers in separate paragraphs and provide their definitions. Use the same idempotencyKey across revisions and translations. Prefer this tool unless publication was explicitly requested.',
      inputSchema: articleSchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'draft' }),
  )
  server.registerTool(
    'insight_publish',
    {
      description:
        'Publish an article immediately, making it public. Call only when the user explicitly asks to publish. Send the complete article and the same idempotencyKey used for its draft. Publishing status is shared across FR/EN; create both translations as drafts before publishing.',
      inputSchema: articleSchema.shape,
      annotations: write,
    },
    (input) => execute({ ...input, operation: 'publish' }),
  )
  return server
}
