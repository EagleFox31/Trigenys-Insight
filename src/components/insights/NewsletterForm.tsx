'use client'

import { ArrowRight } from 'lucide-react'
import React, { FormEvent, useState } from 'react'

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function NewsletterForm() {
  const [state, setState] = useState<FormState>('idle')
  const [message, setMessage] = useState('')

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
      setMessage('Inscription confirmée. La prochaine analyse arrive dans votre boîte mail.')
    } catch {
      setState('error')
      setMessage('Impossible de vous inscrire pour le moment. Réessayez dans quelques instants.')
    }
  }

  return (
    <form className="newsletter-form" onSubmit={subscribe}>
      <label className="sr-only" htmlFor="newsletter-email">
        Adresse e-mail
      </label>
      <input
        autoComplete="email"
        id="newsletter-email"
        name="email"
        placeholder="vous@entreprise.com"
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
        {state === 'loading' ? 'Inscription…' : "S'inscrire"}
        <ArrowRight aria-hidden="true" size={16} />
      </button>
      <p aria-live="polite" className={`newsletter-form__status is-${state}`}>
        {message}
      </p>
    </form>
  )
}
