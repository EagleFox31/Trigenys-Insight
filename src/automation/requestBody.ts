import type { PayloadRequest } from 'payload'
import { EditorialError } from './service'

export async function readEditorialJSON(req: PayloadRequest): Promise<unknown> {
  const maxBytes = 4400000
  if (Number(req.headers.get('content-length')) > maxBytes)
    throw new EditorialError(413, 'request_too_large')
  let text = ''
  if (req.body) {
    const reader = req.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > maxBytes) {
          await reader.cancel()
          throw new EditorialError(413, 'request_too_large')
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }
    text = Buffer.concat(chunks).toString('utf8')
  } else {
    text = (await req.text?.()) ?? ''
    if (Buffer.byteLength(text, 'utf8') > maxBytes)
      throw new EditorialError(413, 'request_too_large')
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new EditorialError(400, 'invalid_json')
  }
}
