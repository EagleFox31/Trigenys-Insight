import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { parseNewsletterRequest } from '@/utilities/newsletter'

export async function POST(request: Request) {
  const subscription = parseNewsletterRequest(await request.json().catch(() => null))

  if (!subscription) {
    return Response.json({ error: 'Invalid subscription request.' }, { status: 400 })
  }

  const { email, locale } = subscription
  const payload = await getPayload({ config: configPromise })
  const existing = await payload.find({
    collection: 'newsletter-subscribers',
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  })

  if (existing.docs[0]) {
    await payload.update({
      collection: 'newsletter-subscribers',
      data: { consentedAt: new Date().toISOString(), locale, status: 'active' },
      id: existing.docs[0].id,
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'newsletter-subscribers',
      data: {
        consentedAt: new Date().toISOString(),
        email,
        locale,
        status: 'active',
      },
      overrideAccess: true,
    })
  }

  return Response.json({ ok: true, created: !existing.docs[0] }, { status: 201 })
}
