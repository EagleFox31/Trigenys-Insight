import configPromise from '@payload-config'
import { getPayload } from 'payload'

import {
  parseNewsletterRequest,
  type NewsletterSubscriptionOutcome,
} from '@/utilities/newsletter'

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

  const subscriber = existing.docs[0]
  let outcome: NewsletterSubscriptionOutcome

  if (!subscriber) {
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
    outcome = 'created'
  } else if (subscriber.status === 'unsubscribed') {
    await payload.update({
      collection: 'newsletter-subscribers',
      data: {
        consentedAt: new Date().toISOString(),
        locale,
        status: 'active',
      },
      id: subscriber.id,
      overrideAccess: true,
    })
    outcome = 'reactivated'
  } else {
    if (subscriber.locale !== locale) {
      await payload.update({
        collection: 'newsletter-subscribers',
        data: { locale },
        id: subscriber.id,
        overrideAccess: true,
      })
    }

    outcome = 'existing'
  }

  return Response.json(
    {
      ok: true,
      subscription: outcome,
    },
    { status: outcome === 'created' ? 201 : 200 },
  )
}
