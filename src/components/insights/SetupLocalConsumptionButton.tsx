'use client'

import { useState } from 'react'

export function SetupLocalConsumptionButton() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function setup() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/editorial/setup-consommer-local', { method: 'POST', credentials: 'include' })
      const result = (await response.json()) as { message?: string }
      setMessage(result.message || (response.ok ? 'Catégories créées.' : 'Une erreur est survenue.'))
    } catch {
      setMessage('Le serveur ne répond pas. Réessaie dans quelques instants.')
    } finally {
      setBusy(false)
    }
  }
  return <div className="mt-6">
    <button className="min-h-12 rounded-md bg-[#102f52] px-6 py-3 font-bold text-white disabled:opacity-60" disabled={busy} onClick={setup} type="button">{busy ? 'Création en cours…' : 'Créer les catégories dans Payload'}</button>
    {message && <p aria-live="polite" className="mt-3 text-sm">{message}</p>}
  </div>
}
