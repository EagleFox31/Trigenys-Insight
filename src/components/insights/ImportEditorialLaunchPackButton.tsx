'use client'

import Link from 'next/link'
import { useState } from 'react'

type ImportedArticle = {
  id: number
  title: string
  editUrl: string
  created: boolean
  englishCreated: boolean
}

type ImportResponse = {
  success: boolean
  results?: ImportedArticle[]
  message?: string
}

export function ImportEditorialLaunchPackButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<ImportedArticle[]>([])

  async function runImport() {
    setState('loading')
    setMessage('')
    setResults([])

    try {
      const response = await fetch('/api/editorial/import-launch-pack', {
        method: 'POST',
        credentials: 'include',
      })
      const body = (await response.json().catch(() => null)) as ImportResponse | null

      if (!response.ok || !body?.success) {
        setState('error')
        setMessage(body?.message || "Impossible d'importer le pack éditorial.")
        return
      }

      setState('success')
      setMessage(body.message || 'Pack éditorial importé.')
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
        onClick={runImport}
        type="button"
      >
        {state === 'loading' ? 'Import des articles…' : 'Importer les articles FR + EN'}
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
                <Link
                  className="font-bold underline underline-offset-4"
                  href={item.editUrl}
                  key={item.id}
                >
                  Ouvrir « {item.title} » dans le CMS →
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
