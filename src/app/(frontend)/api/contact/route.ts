import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { parseContactRequest } from '@/utilities/contact'
import { contactEmailConfigured, sendContactNotification } from '@/utilities/spacemail'

const CONTACT_FORM_TITLE = 'Trigenys Insights Contact'

async function ensureContactForm() {
  const payload = await getPayload({ config: configPromise })
  const existing = await payload.find({
    collection: 'forms',
    limit: 1,
    overrideAccess: true,
    where: { title: { equals: CONTACT_FORM_TITLE } },
  })

  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    collection: 'forms',
    data: {
      title: CONTACT_FORM_TITLE,
      confirmationType: 'message',
    },
    overrideAccess: true,
  })
}

export async function POST(request: Request) {
  const contact = parseContactRequest(await request.json().catch(() => null))

  if (!contact) {
    return Response.json({ error: 'Invalid contact request.' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })
  let stored = false
  let emailSent = false

  try {
    const form = await ensureContactForm()

    await payload.create({
      collection: 'form-submissions',
      data: {
        form: form.id,
        submissionData: [
          { field: 'name', value: contact.name },
          { field: 'email', value: contact.email },
          { field: 'topic', value: contact.topic },
          { field: 'sourceUrl', value: contact.sourceUrl || '' },
          { field: 'message', value: contact.message },
          { field: 'locale', value: contact.locale },
        ],
      },
      overrideAccess: true,
    })

    stored = true
  } catch (error) {
    // Storage should not block the email notification. The two delivery paths are
    // intentionally independent so a temporary CMS issue does not lose a message.
    console.error('Trigenys Insights: contact submission storage failed.', error)
  }

  if (contactEmailConfigured()) {
    try {
      await sendContactNotification(contact, { stored })
      emailSent = true
    } catch (error) {
      console.error('Trigenys Insights: contact email notification failed.', error)
    }
  } else {
    console.error('Trigenys Insights: contact email is not configured.')
  }

  if (!stored && !emailSent) {
    return Response.json(
      {
        error: 'Contact delivery failed.',
        emailSent,
        stored,
      },
      { status: 503 },
    )
  }

  return Response.json({ emailSent, ok: true, stored }, { status: 201 })
}
