'use client'

import { useState } from 'react'

/**
 * Visible only in authenticated Payload admin navigation.
 * Editors opt in once; a frontend deployment cannot mutate production content.
 */
export function SetupRubricsNavControl() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function setupRubrics() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/editorial/setup-rubriques', {
        method: 'POST',
        credentials: 'include',
      })
      const result = (await response.json()) as { message?: string }
      setMessage(result.message || (response.ok ? 'Rubriques créées.' : 'Échec de configuration.'))
    } catch {
      setMessage('Impossible de joindre le serveur.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '8px 12px' }}>
      <button
        disabled={busy}
        onClick={setupRubrics}
        style={{ fontWeight: 600, textAlign: 'left', opacity: busy ? 0.6 : 1 }}
        type="button"
      >
        {busy ? 'Configuration…' : '✦ Installer les 6 rubriques'}
      </button>
      {message && <p aria-live="polite" style={{ fontSize: 12, marginTop: 8 }}>{message}</p>}
    </div>
  )
}
