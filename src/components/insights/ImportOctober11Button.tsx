'use client'

import Link from 'next/link'
import { useState } from 'react'

type Entry = { id: number; slug: string; title: string; editUrl: string; created: boolean; englishCreated: boolean }
type Result = { success: boolean; message?: string; results?: Entry[] }

export function ImportOctober11Button() {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  async function handleImport() {
    setPending(true)
    setResult(null)
    try {
      const res = await fetch('/api/editorial/import-oct11', { method: 'POST', credentials: 'include' })
      const json = await res.json().catch(() => ({})) as Result
      setResult({ ...json, success: res.ok && json.success })
    } catch {
      setResult({ success: false, message: "Erreur réseau. Vérifie Posts avant de relancer." })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-7">
      <button
        className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#102f52] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#173f6c] disabled:opacity-60"
        disabled={pending}
        onClick={handleImport}
        type="button"
      >
        {pending ? 'Import des 4 articles…' : 'Importer les 4 articles du 11 octobre (FR + EN)'}
      </button>
      {result && (
        <div role="status" aria-live="polite" className={'mt-4 rounded-md border p-4 text-sm leading-6 ' +
          (result.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800')}>
          <p>{result.message || (result.success ? 'Import terminé.' : 'Import impossible.')}</p>
          {result.results?.map(item => (
            <p key={item.slug} className="mt-2">
              <Link className="font-semibold underline underline-offset-2" href={item.editUrl}>
                Ouvrir « {item.title} » dans Payload →
              </Link>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
