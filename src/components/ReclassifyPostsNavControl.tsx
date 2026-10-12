'use client'

import { useState } from 'react'

type PreviewRow = {
  id: number
  title: string
  slug: string
  revision: string
  published: boolean
  previous: string[]
  status: string
  target: string | null
  categories: number[] | null
}

export function ReclassifyPostsNavControl() {
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<PreviewRow[] | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function call(action: 'preview' | 'apply') {
    setBusy(true)
    setError('')
    try {
      const changes = (rows || []).filter((row) => row.status === 'change')
      const response = await fetch('/api/editorial/reclassify-posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(action === 'apply'
            ? { approvals: changes.map(({ id, revision }) => ({ id, revision })) }
            : {}),
        }),
      })
      const body = await response.json()
      if (!response.ok) {
        setError(body.error || 'Échec du reclassement.')
        return
      }
      if (action === 'preview') {
        setRows(body.rows || [])
        setMessage(body.message || '')
      } else {
        setRows(null)
        setMessage(body.message || 'Reclassement terminé.')
      }
    } catch {
      setError('Impossible de joindre le serveur.')
    } finally {
      setBusy(false)
    }
  }

  const changes = rows?.filter((row) => row.status === 'change') || []

  return (
    <div style={{ padding: '12px', fontSize: 12, borderTop: '1px solid #393939' }}>
      <button disabled={busy} onClick={() => void call('preview')} type="button" style={{ textAlign: 'left', fontWeight: 650 }}>
        {busy ? 'Chargement…' : '✦ Prévisualiser le reclassement'}
      </button>
      {rows && (
        <div style={{ marginTop: 10 }}>
          <p>{changes.length} articles à reclasser sur {rows.length} (publiés et brouillons).</p>
          <div style={{ maxHeight: 250, overflowY: 'auto', marginTop: 8 }}>
            {changes.map((row) => (
              <div key={row.id} style={{ padding: '6px 0', borderBottom: '1px solid #393939' }}>
                <strong>{row.title}</strong>
                <div>{row.published ? 'Publié' : 'Brouillon'} · {row.target} · anciennes catégories conservées</div>
              </div>
            ))}
          </div>
          {changes.length > 0 && (
            <button
              disabled={busy}
              onClick={() => void call('apply')}
              style={{ marginTop: 12, padding: '8px 10px', background: '#e07520', color: '#171717', borderRadius: 5, fontWeight: 700 }}
              type="button"
            >
              Confirmer le reclassement de {changes.length} articles
            </button>
          )}
        </div>
      )}
      {message && <p aria-live="polite" style={{ marginTop: 8 }}>{message}</p>}
      {error && <p role="alert" style={{ marginTop: 8, color: '#ff9a9a' }}>{error}</p>}
    </div>
  )
}
