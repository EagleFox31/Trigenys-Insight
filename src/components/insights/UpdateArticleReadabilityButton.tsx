'use client'

import Link from 'next/link'
import { useState } from 'react'

type UpdateResult = {
  id?: number
  slug: string
  title?: string
  status: 'updated' | 'unchanged' | 'missing'
  updatedLocales: Array<'fr' | 'en'>
  editUrl?: string
}

type UpdateResponse = {
  success: boolean
  results?: UpdateResult[]
  message?: string
}

export function UpdateArticleReadabilityButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<UpdateResult[]>([])

  async function runUpdate() {
    setState('loading')
    setMessage('')
    setResults([])

    try {
      const response = await fetch('/api/editorial/update-readability', {
        method: 'POST',
        credentials: 'include',
      })

      const body = (await response.json().catch(() => null)) as UpdateResponse | null

      if (!response.ok || !body?.success) {
        setState('error')
        setMessage(body?.message || "Impossible de mettre les articles à jour.")
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
        className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#e07520] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#c96217] disabled:cursor-wait disabled:opacity-60"
        disabled={state === 'loading'}
        onClick={runUpdate}
        type="button"
      >
        {state === 'loading'
          ? 'Révision FR + EN en cours…'
          : 'Améliorer les articles existants FR + EN'}
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
              {results.map((item) => {
                const statusLabel =
                  item.status === 'updated'
                    ? 'mis à jour (' +
                      item.updatedLocales.map((locale) => locale.toUpperCase()).join(' + ') +
                      ')'
                    : item.status === 'unchanged'
                      ? 'déjà à jour'
                      : 'absent du CMS'

                return (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-current/10 pt-2 first:border-t-0 first:pt-0"
                    key={item.slug}
                  >
                    <span>
                      <strong>{item.title || item.slug}</strong>
                      {' — '}
                      {statusLabel}
                    </span>

                    {item.editUrl && (
                      <Link className="font-bold underline underline-offset-4" href={item.editUrl}>
                        Ouvrir →
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
