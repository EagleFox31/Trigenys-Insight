import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

export async function getEditorialUser() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  return user
}
