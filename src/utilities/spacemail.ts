import tls from 'node:tls'
import { createInterface } from 'node:readline'

import type { ContactRequest, ContactTopic } from '@/utilities/contact'

const SMTP_HOST = 'mail.spacemail.com'
const SMTP_PORT = 465
const DEFAULT_SMTP_USER = 'jennifer@trigenys.com'
const DEFAULT_FROM = 'contact@trigenys.com'
const DEFAULT_TO = 'contact@trigenys.com'

const topicLabels: Record<ContactTopic, { fr: string; en: string }> = {
  correction: { fr: 'Correction factuelle', en: 'Factual correction' },
  source: { fr: 'Source ou document', en: 'Source or document' },
  signal: { fr: 'Sujet à investiguer', en: 'Story signal' },
  partnership: { fr: 'Partenariat ou presse', en: 'Partnership or press' },
  general: { fr: 'Autre demande', en: 'General enquiry' },
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

function dotStuff(value: string) {
  return value.replace(/^\./gm, '..')
}

function smtpConfig() {
  return {
    user: process.env.SPACEMAIL_SMTP_USER || DEFAULT_SMTP_USER,
    password: process.env.SPACEMAIL_SMTP_PASSWORD || '',
    from: process.env.CONTACT_EMAIL_FROM || DEFAULT_FROM,
    to: process.env.CONTACT_EMAIL_TO || DEFAULT_TO,
  }
}

export function contactEmailConfigured() {
  return Boolean(smtpConfig().password)
}

export async function sendContactNotification(contact: ContactRequest) {
  const config = smtpConfig()

  if (!config.password) {
    throw new Error('SPACEMAIL_SMTP_PASSWORD is not configured.')
  }

  const topic = topicLabels[contact.topic][contact.locale]
  const subject = `[Trigenys Insights] ${topic} — ${contact.name}`
  const body = [
    'Nouveau message reçu depuis insight.trigenys.com/contact',
    '',
    `Nom: ${contact.name}`,
    `E-mail: ${contact.email}`,
    `Sujet: ${topic}`,
    contact.sourceUrl ? `Lien: ${contact.sourceUrl}` : null,
    `Langue: ${contact.locale.toUpperCase()}`,
    '',
    'Message:',
    contact.message,
    '',
    'Le formulaire a aussi été enregistré dans Payload CMS.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  const socket = tls.connect({
    host: SMTP_HOST,
    port: SMTP_PORT,
    servername: SMTP_HOST,
    rejectUnauthorized: true,
  })

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }
    const onSecure = () => {
      cleanup()
      resolve()
    }
    const cleanup = () => {
      socket.off('error', onError)
      socket.off('secureConnect', onSecure)
    }

    socket.once('error', onError)
    socket.once('secureConnect', onSecure)
  })

  const lines = createInterface({ input: socket, crlfDelay: Infinity })
  const iterator = lines[Symbol.asyncIterator]()

  async function readResponse(expectedCodes: number[]) {
    let response = ''

    while (true) {
      const next = await iterator.next()
      if (next.done) throw new Error(`SMTP connection closed unexpectedly. ${response}`)

      const line = String(next.value)
      response += `${line}\n`

      const match = line.match(/^(\d{3})([ -])/)
      if (!match) continue
      if (match[2] === '-') continue

      const code = Number(match[1])
      if (!expectedCodes.includes(code)) {
        throw new Error(`SMTP error ${code}: ${response.trim()}`)
      }

      return response
    }
  }

  async function command(value: string, expectedCodes: number[]) {
    socket.write(`${value}\r\n`)
    return readResponse(expectedCodes)
  }

  try {
    await readResponse([220])
    await command('EHLO insight.trigenys.com', [250])
    await command('AUTH LOGIN', [334])
    await command(Buffer.from(config.user).toString('base64'), [334])
    await command(Buffer.from(config.password).toString('base64'), [235])
    await command(`MAIL FROM:<${config.from}>`, [250])
    await command(`RCPT TO:<${config.to}>`, [250, 251])
    await command('DATA', [354])

    const message = [
      `From: Trigenys Insights <${config.from}>`,
      `To: ${config.to}`,
      `Reply-To: ${contact.name} <${contact.email}>`,
      `Subject: ${encodeHeader(subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <contact-${Date.now()}@trigenys.com>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      dotStuff(body),
    ].join('\r\n')

    socket.write(`${message}\r\n.\r\n`)
    await readResponse([250])
    await command('QUIT', [221])
  } finally {
    lines.close()
    socket.end()
  }
}
