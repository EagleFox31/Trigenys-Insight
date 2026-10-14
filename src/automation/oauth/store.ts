import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { InsightOAuth, type OAuthRecord, type OAuthStore } from './core'

export class PostgresOAuthStore implements OAuthStore {
  constructor(private pool: Payload['db']['pool']) {}
  async get(key: string): Promise<OAuthRecord | null> {
    const result = await this.pool.query('SELECT key, kind, data, expires_at, used_at FROM insight_oauth_records WHERE key = $1', [key])
    const row = result.rows[0]
    return row ? { key: row.key, kind: row.kind, data: row.data, expiresAt: new Date(row.expires_at), used: Boolean(row.used_at) } : null
  }
  async put(value: OAuthRecord) {
    await this.pool.query('INSERT INTO insight_oauth_records (key, kind, data, expires_at) VALUES ($1,$2,$3::jsonb,$4)', [value.key, value.kind, JSON.stringify(value.data), value.expiresAt])
  }
  async consumeAndPut(key: string, records: OAuthRecord[]) {
    const connection = await this.pool.connect()
    try {
      await connection.query('BEGIN')
      const consumed = await connection.query('UPDATE insight_oauth_records SET used_at = NOW() WHERE key = $1 AND used_at IS NULL AND expires_at > NOW() RETURNING key', [key])
      if (!consumed.rowCount) { await connection.query('ROLLBACK'); return false }
      for (const value of records) await connection.query('INSERT INTO insight_oauth_records (key, kind, data, expires_at) VALUES ($1,$2,$3::jsonb,$4)', [value.key, value.kind, JSON.stringify(value.data), value.expiresAt])
      await connection.query('COMMIT')
      return true
    } catch (error) { await connection.query('ROLLBACK'); throw error }
    finally { connection.release() }
  }
  async revokeFamily(key: string) {
    await this.pool.query(`UPDATE insight_oauth_records SET data = jsonb_set(data, '{revoked}', 'true'::jsonb) WHERE key = $1 AND kind = 'family'`, [key])
  }
  async rateLimit(key: string, limit: number) {
    const result = await this.pool.query(`INSERT INTO insight_oauth_rate_limits (key, count, window_start) VALUES ($1, 1, NOW())
      ON CONFLICT (key) DO UPDATE SET count = CASE WHEN insight_oauth_rate_limits.window_start < NOW() - INTERVAL '1 minute' THEN 1 ELSE insight_oauth_rate_limits.count + 1 END,
      window_start = CASE WHEN insight_oauth_rate_limits.window_start < NOW() - INTERVAL '1 minute' THEN NOW() ELSE insight_oauth_rate_limits.window_start END RETURNING count`, [key])
    if (key.endsWith(':global') && result.rows[0].count === 1) {
      await this.pool.query('DELETE FROM insight_oauth_records WHERE key IN (SELECT key FROM insight_oauth_records WHERE expires_at < NOW() LIMIT 200)')
      await this.pool.query(`DELETE FROM insight_oauth_rate_limits WHERE window_start < NOW() - INTERVAL '1 day'`)
    }
    return result.rows[0].count <= limit
  }
}

export async function oauthBackend() {
  const payload = await getPayload({ config })
  const store = new PostgresOAuthStore(payload.db.pool)
  const oauth = new InsightOAuth(store, async (id) => {
    try { return Boolean(await payload.findByID({ collection: 'users', id, depth: 0, select: { name: true }, overrideAccess: true })) }
    catch { return false }
  })
  return { payload, store, oauth }
}
