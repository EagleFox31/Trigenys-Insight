'use client'

import type { SiteLocale } from '@/i18n/config'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import React, { FormEvent, useState } from 'react'

type FormState = 'idle' | 'loading' | 'success' | 'error'

const copy = {
  fr: {
    name: 'Nom',
    email: 'E-mail',
    topic: 'Sujet',
    sourceUrl: 'Lien utile',
    sourceHint: 'Optionnel. Ajoutez une source, un document public ou une page concernée.',
    message: 'Message',
    submit: 'Envoyer le message',
    loading: 'Envoi en cours…',
    successTitle: 'Message reçu.',
    success:
      'Votre message a été enregistré par Trigenys Insights. Nous pourrons le vérifier depuis notre espace éditorial.',
    error: "Le message n'a pas pu être envoyé. Réessayez dans quelques instants.",
    privacy:
      'N’envoyez pas de mot de passe, de donnée bancaire ou de document confidentiel par ce formulaire.',
    topics: {
      correction: 'Correction factuelle',
      source: 'Source ou document',
      signal: 'Sujet à investiguer',
      partnership: 'Partenariat ou presse',
      general: 'Autre demande',
    },
  },
  en: {
    name: 'Name',
    email: 'Email',
    topic: 'Topic',
    sourceUrl: 'Useful link',
    sourceHint: 'Optional. Add a source, public document or relevant page.',
    message: 'Message',
    submit: 'Send message',
    loading: 'Sending…',
    successTitle: 'Message received.',
    success:
      'Your message has been saved by Trigenys Insights and can be reviewed from our editorial workspace.',
    error: 'The message could not be sent. Please try again in a moment.',
    privacy:
      'Do not send passwords, banking information or confidential documents through this form.',
    topics: {
      correction: 'Factual correction',
      source: 'Source or document',
      signal: 'Story tip',
      partnership: 'Partnership or press',
      general: 'Other request',
    },
  },
} as const

export function ContactForm({ locale }: { locale: SiteLocale }) {
  const t = copy[locale]
  const [state, setState] = useState<FormState>('idle')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)

    setState('loading')
    setMessage('')

    try {
      const response = await fetch('/api/contact', {
        body: JSON.stringify({
          email: form.get('email'),
          locale,
          message: form.get('message'),
          name: form.get('name'),
          sourceUrl: form.get('sourceUrl'),
          topic: form.get('topic'),
          website: form.get('website'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) throw new Error('Contact request failed')

      formElement.reset()
      setState('success')
      setMessage(t.success)
    } catch {
      setState('error')
      setMessage(t.error)
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-xl border border-[#cfd9cf] bg-[#f4f8f2] p-7 md:p-8">
        <CheckCircle2 aria-hidden="true" className="mb-5 text-[#315b36]" size={28} />
        <h2 className="font-[var(--font-fraunces)] text-3xl font-semibold text-[#102f52]">
          {t.successTitle}
        </h2>
        <p className="mt-3 max-w-[58ch] leading-7 text-[#4d5b55]">{message}</p>
      </div>
    )
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-[#102f52]">
          <span>{t.name}</span>
          <input
            autoComplete="name"
            className="w-full rounded-md border border-[#d8d9d2] bg-white px-4 py-3 text-base font-normal text-[#24313a] outline-none transition focus:border-[#e07520] focus:ring-2 focus:ring-[#e07520]/15"
            name="name"
            required
            type="text"
          />
        </label>

        <label className="space-y-2 text-sm font-semibold text-[#102f52]">
          <span>{t.email}</span>
          <input
            autoComplete="email"
            className="w-full rounded-md border border-[#d8d9d2] bg-white px-4 py-3 text-base font-normal text-[#24313a] outline-none transition focus:border-[#e07520] focus:ring-2 focus:ring-[#e07520]/15"
            name="email"
            required
            type="email"
          />
        </label>
      </div>

      <label className="block space-y-2 text-sm font-semibold text-[#102f52]">
        <span>{t.topic}</span>
        <select
          className="w-full rounded-md border border-[#d8d9d2] bg-white px-4 py-3 text-base font-normal text-[#24313a] outline-none transition focus:border-[#e07520] focus:ring-2 focus:ring-[#e07520]/15"
          defaultValue="correction"
          name="topic"
          required
        >
          {Object.entries(t.topics).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2 text-sm font-semibold text-[#102f52]">
        <span>{t.sourceUrl}</span>
        <input
          className="w-full rounded-md border border-[#d8d9d2] bg-white px-4 py-3 text-base font-normal text-[#24313a] outline-none transition focus:border-[#e07520] focus:ring-2 focus:ring-[#e07520]/15"
          name="sourceUrl"
          placeholder="https://"
          type="url"
        />
        <span className="block text-xs font-normal leading-5 text-[#6c747a]">{t.sourceHint}</span>
      </label>

      <label className="block space-y-2 text-sm font-semibold text-[#102f52]">
        <span>{t.message}</span>
        <textarea
          className="min-h-[190px] w-full resize-y rounded-md border border-[#d8d9d2] bg-white px-4 py-3 text-base font-normal leading-7 text-[#24313a] outline-none transition focus:border-[#e07520] focus:ring-2 focus:ring-[#e07520]/15"
          minLength={20}
          name="message"
          required
        />
      </label>

      <input
        aria-hidden="true"
        autoComplete="off"
        className="hidden"
        name="website"
        tabIndex={-1}
        type="text"
      />

      <div className="flex flex-col gap-4 border-t border-[#e1e1da] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[58ch] text-xs leading-5 text-[#6c747a]">{t.privacy}</p>
        <button
          className="inline-flex min-w-fit items-center justify-center gap-2 rounded-md bg-[#102f52] px-5 py-3 font-semibold text-white transition hover:bg-[#153f6d] disabled:cursor-wait disabled:opacity-60"
          disabled={state === 'loading'}
          type="submit"
        >
          {state === 'loading' ? t.loading : t.submit}
          <ArrowRight aria-hidden="true" size={16} />
        </button>
      </div>

      {state === 'error' && (
        <p aria-live="polite" className="text-sm font-medium text-[#a23a2a]">
          {message}
        </p>
      )}
    </form>
  )
}
