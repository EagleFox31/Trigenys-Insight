'use client'

import Link from 'next/link'
import { useState } from 'react'

type ImportResponse = {
  success: boolean
  created?: boolean
  editUrl?: string
  message?: string
}

export function ImportCybastionButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [editUrl, setEditUrl] = useState('')

  async function runImport() {
    setState('loading')
    setMessage('')
    setEditUrl('')

    try {
      const response = await fetch('/api/editorial/import-cybastion', {
        method: 'POST',
        credentials: 'include',
      })
      const body = (await response.json().catch(() => null)) as ImportResponse | null

      if (!response.ok || !body?.success) {
        setState('error')
        setMessage(body?.message || "Impossible d'importer l'article.")
        return
      }

      setState('success')
      setMessage(body.message || 'Article importé.')
      setEditUrl(body.editUrl || '')
    } catch {
      setState('error')
      setMessage("Le serveur n'a pas répondu. Réessaie dans quelques instants.")
    }
  }

  return (
    <div className="mt-8">
      <button
        className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#102f52] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#173f6c] disabled:cursor-wait disabled:opacity-60"
        disabled={state === 'loading'}
        onClick={runImport}
        type="button"
      >
        {state === 'loading' ? 'Import en cours…' : 'Importer dans Trigenys Insights'}
      </button>

      {message && (
        <div
          className={
            'mt-4 rounded-md border p-4 text-sm leading-6 ' +
            (state === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800')
          }
        >
          <p className="m-0">{message}</p>
          {editUrl && (
            <Link className="mt-2 inline-block font-bold underline underline-offset-4" href={editUrl}>
              Ouvrir le brouillon dans le CMS →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
