import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { parseContactRequest } from '@/utilities/contact'

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
      fields: [
        { blockType: 'text', name: 'name', label: 'Name', required: true },
        { blockType: 'email', name: 'email', label: 'Email', required: true },
        {
          blockType: 'select',
          name: 'topic',
          label: 'Topic',
          required: true,
          options: [
            { label: 'Correction', value: 'correction' },
            { label: 'Primary source', value: 'source' },
            { label: 'Story signal', value: 'signal' },
            { label: 'Partnership / press', value: 'partnership' },
            { label: 'General', value: 'general' },
          ],
        },
        { blockType: 'text', name: 'sourceUrl', label: 'Source URL', required: false },
        { blockType: 'textarea', name: 'message', label: 'Message', required: true },
        { blockType: 'text', name: 'locale', label: 'Locale', required: true },
      ],
      submitButtonLabel: 'Send',
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

  return Response.json({ ok: true }, { status: 201 })
}
