'use client'

import type { SiteLocale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import { ArrowRight } from 'lucide-react'
import React, { FormEvent, useState } from 'react'

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function NewsletterForm({ locale = 'fr' }: { locale?: SiteLocale }) {
  const [state, setState] = useState<FormState>('idle')
  const [message, setMessage] = useState('')
  const t = getMessages(locale).newsletter

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)

    setState('loading')
    setMessage('')

    try {
      const response = await fetch('/api/newsletter', {
        body: JSON.stringify({
          email: form.get('email'),
          website: form.get('website'),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) throw new Error('Subscription request failed')

      formElement.reset()
      setState('success')
      setMessage(t.success)
    } catch {
      setState('error')
      setMessage(t.error)
    }
  }

  return (
    <form className="newsletter-form" onSubmit={subscribe}>
      <label className="sr-only" htmlFor="newsletter-email">
        {locale === 'fr' ? 'Adresse e-mail' : 'Email address'}
      </label>
      <input
        autoComplete="email"
        id="newsletter-email"
        name="email"
        placeholder={t.placeholder}
        required
        type="email"
      />
      <input
        aria-hidden="true"
        className="newsletter-form__honeypot"
        name="website"
        tabIndex={-1}
      />
      <button disabled={state === 'loading'} type="submit">
        {state === 'loading' ? t.loading : t.submit}
        <ArrowRight aria-hidden="true" size={16} />
      </button>
      <p aria-live="polite" className={`newsletter-form__status is-${state}`}>
        {message}
      </p>
    </form>
  )
}
