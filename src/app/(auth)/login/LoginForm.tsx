'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

type LoginErrorResponse = {
  errors?: Array<{ message?: string }>
  message?: string
}

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as LoginErrorResponse | null
        const message = body?.errors?.[0]?.message || body?.message

        setError(
          response.status === 401 || response.status === 400
            ? 'Adresse e-mail ou mot de passe incorrect.'
            : message || 'Connexion impossible pour le moment. Réessaie dans quelques instants.',
        )
        return
      }

      router.replace('/admin')
      router.refresh()
    } catch {
      setError('Le serveur est momentanément inaccessible. Vérifie ta connexion et réessaie.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="admin-login__form" onSubmit={handleSubmit}>
      <label htmlFor="email">Adresse e-mail</label>
      <input
        autoComplete="email"
        id="email"
        name="email"
        placeholder="admin@trigenys.com"
        required
        type="email"
      />

      <label htmlFor="password">Mot de passe</label>
      <input
        autoComplete="current-password"
        id="password"
        name="password"
        required
        type="password"
      />

      <p aria-live="polite" className="admin-login__error" role={error ? 'alert' : undefined}>
        {error}
      </p>

      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Connexion…' : 'Se connecter'}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  )
}
