'use client'

import Link from 'next/link'
import { useState } from 'react'

export function ImportWhispButton() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [editUrl, setEditUrl] = useState('')
  async function runImport() {
    setBusy(true)
    setMessage('')
    setEditUrl('')
    try {
      const response = await fetch('/api/editorial/import-whisp', { method: 'POST', credentials: 'include' })
      const result = (await response.json()) as { success?: boolean; message?: string; editUrl?: string }
      setMessage(result.message || (response.ok ? 'Import terminé.' : 'Import impossible.'))
      if (response.ok && result.success) setEditUrl(result.editUrl || '')
    } catch {
      setMessage('Le serveur ne répond pas. Réessaie dans quelques instants.')
    } finally {
      setBusy(false)
    }
  }
  return <div className="mt-6">
    <button className="min-h-12 rounded-md bg-[#102f52] px-6 py-3 font-bold text-white disabled:opacity-60" disabled={busy} onClick={runImport} type="button">{busy ? 'Import en cours…' : 'Importer l’article Whisp dans Payload'}</button>
    {message && <p aria-live="polite" className="mt-3 text-sm">{message}</p>}
    {editUrl && <Link className="font-bold underline" href={editUrl}>Ouvrir le brouillon →</Link>}
  </div>
}
