import type { PayloadRequest } from 'payload'
import type { BufferChannel } from './client'
export type SocialState =
  | 'pending-bootstrap'
  | 'pending-preparation'
  | 'pending-revision'
  | 'pending-draft'
  | 'sending'
  | 'draft'
  | 'pending-schedule'
  | 'scheduled'
  | 'sent'
  | 'pending-cancel'
  | 'failed'
  | 'uncertain'
  | 'blocked'
export type SocialRequest = {
  postId: number
  locale: 'fr' | 'en'
  channelId?: string
  text?: string
  imageURL?: string
  sourceURL?: string
  channel?: BufferChannel
  bootstrap?: boolean
  previousText?: string
  publishAt?: string
}
export type SocialExport = {
  id: string
  post_id: number
  idempotency_key: string
  body_hash: string
  state: SocialState
  request: SocialRequest
  remote_post_id: string | null
  remote_status: string | null
  last_error: string | null
  attempts: number
  updated_at: Date | string
  created_at: Date | string
}
export async function socialQuery<T>(
  req: PayloadRequest,
  query: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await req.payload.db.pool.query(query, values)
  return result.rows as T[]
}
export async function socialArticleStatus(req: PayloadRequest, postId: number) {
  if (!process.env.BUFFER_API_KEY?.trim()) return undefined
  const [connection, exports] = await Promise.all([
    socialQuery<{ checked_at: Date; channels: BufferChannel[]; last_error: string | null }>(
      req,
      'SELECT checked_at, channels, last_error FROM insight_buffer_connection WHERE id = true',
    ),
    socialQuery<SocialExport>(
      req,
      'SELECT * FROM insight_social_exports WHERE post_id = $1 ORDER BY created_at DESC LIMIT 20',
      [postId],
    ),
  ])
  return {
    configured: true,
    connection: connection[0] ?? null,
    exports: exports.map(summarizeExport),
  }
}
export function summarizeExport(row: SocialExport) {
  return {
    id: row.id,
    postId: row.post_id,
    state: row.state,
    locale: row.request.locale,
    channel: row.request.channel ?? null,
    text: row.request.text ?? null,
    imageURL: row.request.imageURL ?? null,
    sourceURL: row.request.sourceURL ?? null,
    bufferPostId: row.remote_post_id,
    bufferStatus: row.remote_status,
    publishAt: row.request.publishAt ?? null,
    lastError: row.last_error,
    updatedAt: new Date(row.updated_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
  }
}
