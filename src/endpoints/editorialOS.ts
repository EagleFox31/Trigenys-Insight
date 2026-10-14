import type { Endpoint } from 'payload'
import { operationSchema } from '../../packages/insight-automation/src/schema'
import { readEditorialJSON } from '@/automation/requestBody'
import { authorizedEditorialRequest } from '@/automation/auth'
import { EditorialError, executeEditorialOperation } from '@/automation/service'

export const editorialOSEndpoint: Endpoint = {
  path: '/editorial-os',
  method: 'post',
  handler: async (req) => {
    if (!authorizedEditorialRequest(req.headers.get('authorization'))) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }
    let json: unknown
    try {
      json = await readEditorialJSON(req)
    } catch (error) {
      if (error instanceof EditorialError)
        return Response.json({ error: error.code }, { status: error.status })
      return Response.json({ error: 'invalid_json' }, { status: 400 })
    }
    const parsed = operationSchema.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        {
          error: 'invalid_request',
          issues: parsed.error.issues.map(({ path, message }) => ({ path, message })),
        },
        { status: 400 },
      )
    }
    try {
      return Response.json(await executeEditorialOperation(req, parsed.data))
    } catch (error) {
      if (error instanceof EditorialError)
        return Response.json({ error: error.code }, { status: error.status })
      req.payload.logger.error({ err: error }, 'Editorial automation request failed')
      return Response.json({ error: 'publication_failed' }, { status: 500 })
    }
  },
}
