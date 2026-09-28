'use client'

import Link from 'next/link'
import { useState } from 'react'

type RefreshResult = {
  id?: number
  slug: string
  title?: string
  status: 'updated' | 'unchanged' | 'missing'
  updatedLocales: Array<'fr' | 'en'>
  sourcesUpdated: boolean
  editUrl?: string
}

type RefreshResponse = {
  success: boolean
  results?: RefreshResult[]
  message?: string
}

export function RefreshSeptemberEditorialButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<RefreshResult[]>([])

  async function runRefresh() {
    setState('loading')
    setMessage('')
    setResults([])

    try {
      const response = await fetch('/api/editorial/refresh-sept28', {
        method: 'POST',
        credentials: 'include',
      })
      const body = (await response.json().catch(() => null)) as RefreshResponse | null

      if (!response.ok || !body?.success) {
        setState('error')
        setMessage(body?.message || 'Impossible de mettre les trois articles à jour.')
        return
      }

      setState('success')
      setMessage(body.message || 'Mise à jour terminée.')
      setResults(body.results || [])
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
        onClick={runRefresh}
        type="button"
      >
        {state === 'loading'
          ? 'Mise à jour FR + EN…'
          : 'Mettre à jour les 3 articles déjà importés'}
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

          {results.length > 0 && (
            <div className="mt-4 grid gap-2">
              {results.map((item) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-current/10 pt-2 first:border-t-0 first:pt-0"
                  key={item.slug}
                >
                  <span>
                    <strong>{item.title || item.slug}</strong>
                    {' — '}
                    {item.status === 'updated'
                      ? 'mis à jour'
                      : item.status === 'unchanged'
                        ? 'déjà à jour'
                        : 'absent de Payload'}
                  </span>

                  {item.editUrl && (
                    <Link className="font-bold underline underline-offset-4" href={item.editUrl}>
                      Ouvrir →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
