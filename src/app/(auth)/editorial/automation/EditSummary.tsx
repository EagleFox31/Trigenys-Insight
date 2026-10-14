'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  InsightClient,
  type UpdatePostResult,
} from '../../../../../packages/insight-automation/src/index'
import { portfolioArticle } from '@/editorial/github-portfolio'

export function EditSummary() {
  const [pending, setPending] = useState(false)
  const [loadedId, setLoadedId] = useState<number | null>(null)
  const [fr, setFr] = useState('')
  const [en, setEn] = useState('')
  const [message, setMessage] = useState('')
  const [url, setURL] = useState<string | null>(null)
  const sdk = () =>
    new InsightClient({ baseURL: window.location.origin, session: true, timeoutMs: 60000 })

  async function load() {
    setPending(true)
    try {
      const client = sdk()
      const french = await client.getPost(portfolioArticle.fr.idempotencyKey, 'fr')
      const english = await client.getPost(portfolioArticle.en.idempotencyKey, 'en')
      if (french.post.id !== english.post.id || typeof french.post.id !== 'number')
        throw new Error('Identifiants incohérents')
      setLoadedId(french.post.id)
      setFr(String(french.post.excerpt ?? ''))
      setEn(String(english.post.excerpt ?? ''))
      setMessage(`Article ${french.post.id} chargé. Statut : ${String(french.post._status)}.`)
    } catch (error) {
      setMessage(`Erreur : ${error instanceof Error ? error.message : 'Chargement impossible'}`)
    } finally {
      setPending(false)
    }
  }

  async function save() {
    if (!loadedId) return
    setPending(true)
    const mcp = new Client({ name: 'trigenys-editorial-summary-editor', version: '0.1.0' })
    try {
      await mcp.connect(
        new StreamableHTTPClientTransport(new URL('/api/mcp', window.location.origin), {
          requestInit: { credentials: 'same-origin' },
        }),
      )
      for (const locale of ['fr', 'en'] as const) {
        const before = await sdk().getPost(portfolioArticle[locale].idempotencyKey, locale)
        const result = await mcp.callTool({
          name: 'insight_update_post',
          arguments: {
            idempotencyKey: portfolioArticle[locale].idempotencyKey,
            locale,
            excerpt: locale === 'fr' ? fr : en,
            seoDescription: portfolioArticle[locale].metadata?.seo?.description,
            expectedUpdatedAt: String(before.post.updatedAt),
          },
        })
        if (result.isError) throw new Error(JSON.stringify(result.content))
        const updated = result.structuredContent as UpdatePostResult | undefined
        if (!updated?.ok || updated.id !== loadedId)
          throw new Error('La mise à jour n’a pas été confirmée')
        const after = await sdk().getPost(portfolioArticle[locale].idempotencyKey, locale)
        if (
          after.post.excerpt !== (locale === 'fr' ? fr : en) ||
          after.post._status !== before.post._status ||
          JSON.stringify(after.post.content) !== JSON.stringify(before.post.content) ||
          after.post.heroImage !== before.post.heroImage
        ) {
          throw new Error('La vérification après modification a échoué')
        }
        if (locale === 'fr') setURL(updated.url)
      }
      setMessage(
        `Résumés FR et EN modifiés via le MCP sur l’article ${loadedId}. Relecture SDK réussie : contenu, image et statut conservés.`,
      )
    } catch (error) {
      setMessage(`Erreur : ${error instanceof Error ? error.message : 'Modification impossible'}`)
    } finally {
      await mcp.close().catch(() => undefined)
      setPending(false)
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-slate-200 p-6">
      <h2 className="text-xl font-semibold">Modifier les résumés de l’article existant</h2>
      <button
        className="mt-4 rounded-md border border-slate-300 px-4 py-2 disabled:opacity-50"
        disabled={pending}
        onClick={load}
      >
        Charger les résumés publiés
      </button>
      <div className="mt-5 grid gap-5">
        <label className="block font-medium">
          Résumé français
          <textarea
            maxLength={320}
            disabled={pending || !loadedId}
            value={fr}
            onChange={(event) => setFr(event.target.value)}
            className="mt-2 block min-h-28 w-full rounded-md border border-slate-300 p-3 font-normal"
          />
        </label>
        <label className="block font-medium">
          Résumé anglais
          <textarea
            maxLength={320}
            disabled={pending || !loadedId}
            value={en}
            onChange={(event) => setEn(event.target.value)}
            className="mt-2 block min-h-28 w-full rounded-md border border-slate-300 p-3 font-normal"
          />
        </label>
      </div>
      <button
        className="mt-5 rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
        disabled={pending || !loadedId || !fr.trim() || !en.trim()}
        onClick={save}
      >
        {pending ? 'Modification en cours…' : 'Enregistrer les résumés'}
      </button>
      <p role="status" className="mt-4 text-sm">
        {message}
      </p>
      {url && (
        <Link href={url} className="mt-3 block underline">
          Vérifier le résumé sur l’article →
        </Link>
      )}
    </section>
  )
}
