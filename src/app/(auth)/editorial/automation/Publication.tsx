'use client'

import Link from 'next/link'
import { EditSummary } from './EditSummary'
import { useRef, useState } from 'react'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  InsightClient,
  type ArticleInput,
  type PublicationResult,
} from '../../../../../packages/insight-automation/src/index'
import { portfolioArticle, portfolioSources } from '@/editorial/github-portfolio'

export function AutomationPublication({ authorId }: { authorId: number }) {
  const [pending, setPending] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [draft, setDraft] = useState<PublicationResult | null>(null)
  const [publication, setPublication] = useState<PublicationResult | null>(null)
  const prepared = useRef<Record<'fr' | 'en', ArticleInput> | null>(null)
  const log = (message: string) => setMessages((previous) => [...previous, message])
  const sdk = () =>
    new InsightClient({ baseURL: window.location.origin, session: true, timeoutMs: 60000 })

  async function prepare() {
    setPending(true)
    try {
      const client = sdk()
      if (!prepared.current) {
        const authors = await client.listAuthors()
        const categories = await client.listCategories('fr')
        if (
          !authors.docs.some((author) => author.id === authorId) ||
          !categories.docs.some((category) => category.id === 10)
        ) {
          throw new Error('Auteur ou rubrique indisponible')
        }
        log('Auteur et rubrique Études & Carrières vérifiés.')
        const response = await fetch('/editorial/github-portfolio/hero.webp')
        if (!response.ok) throw new Error('Image de couverture indisponible')
        const bytes = new Uint8Array(await response.arrayBuffer())
        const image = await client.uploadMedia({
          filename: 'github-portfolio.webp',
          mimeType: 'image/webp',
          alt: 'Illustration générée par IA : une développeuse compare son CV à un projet logiciel dans un bureau lumineux.',
          dataBase64: btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')),
        })
        log(`Image de couverture enregistrée : média ${image.id}.`)
        const sources: number[] = []
        for (const source of portfolioSources) sources.push((await client.upsertSource(source)).id)
        prepared.current = {
          fr: { ...portfolioArticle.fr, authors: [authorId], heroImage: image.id, sources },
          en: { ...portfolioArticle.en, authors: [authorId], heroImage: image.id, sources },
        }
      }
      const fr = await client.createDraft(prepared.current.fr)
      const en = await client.createDraft(prepared.current.en)
      if (fr.id !== en.id || (draft && draft.id !== fr.id))
        throw new Error('Les identifiants des articles ne correspondent pas')
      setDraft(fr)
      log(`Brouillons FR et EN enregistrés sur le même article ${fr.id}.`)
      const stored = await client.getPost(prepared.current.fr.idempotencyKey, 'fr')
      if (stored.post.id !== fr.id) throw new Error('La relecture du brouillon a échoué')
      log('Relecture du brouillon réussie. Les relances conservent le même identifiant.')
    } catch (error) {
      log(`Erreur : ${error instanceof Error ? error.message : 'Opération impossible'}`)
    } finally {
      setPending(false)
    }
  }

  async function publish() {
    if (!prepared.current || !draft) return
    setPending(true)
    const mcp = new Client({ name: 'trigenys-editorial-workspace', version: '0.1.0' })
    try {
      const transport = new StreamableHTTPClientTransport(
        new URL('/api/mcp', window.location.origin),
        { requestInit: { credentials: 'same-origin' } },
      )
      await mcp.connect(transport)
      const tools = await mcp.listTools()
      if (!tools.tools.some((tool) => tool.name === 'insight_publish'))
        throw new Error('Outil de publication indisponible')
      log(`Connexion MCP réussie : ${tools.tools.length} outils disponibles.`)
      const result = await mcp.callTool({ name: 'insight_publish', arguments: prepared.current.fr })
      if (result.isError) throw new Error(JSON.stringify(result.content))
      const published = result.structuredContent as PublicationResult | undefined
      if (!published?.ok || published.id !== draft.id || published.status !== 'PUBLISHED')
        throw new Error('La publication n’a pas été confirmée')
      const stored = await sdk().getPost(prepared.current.fr.idempotencyKey, 'fr')
      if (stored.post._status !== 'published')
        throw new Error('Le statut publié n’a pas été retrouvé')
      setPublication(published)
      log(`Publication MCP confirmée et relue par le SDK : article ${published.id}.`)
    } catch (error) {
      log(`Erreur : ${error instanceof Error ? error.message : 'Publication impossible'}`)
    } finally {
      await mcp.close().catch(() => undefined)
      setPending(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 text-[#102f52]">
      <Link href="/admin" className="text-sm underline">
        ← Espace éditorial
      </Link>
      <p className="mt-10 text-sm font-semibold uppercase tracking-widest text-emerald-700">
        Études & Carrières
      </p>
      <h1 className="mt-3 font-[var(--font-fraunces)] text-4xl font-semibold">
        {portfolioArticle.fr.title}
      </h1>
      <p className="mt-5 text-lg leading-8 text-slate-600">{portfolioArticle.fr.excerpt}</p>
      <p className="mt-4 text-sm text-slate-600">
        Versions française et anglaise · graphique sourcé · couverture originale.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <button
          disabled={pending || Boolean(publication)}
          onClick={prepare}
          className="rounded-md bg-[#102f52] px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {pending
            ? 'Opération en cours…'
            : draft
              ? 'Relancer l’enregistrement des brouillons'
              : 'Préparer les brouillons FR et EN'}
        </button>
        <button
          disabled={pending || !draft || Boolean(publication)}
          onClick={publish}
          className="rounded-md bg-emerald-700 px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          Publier l’article
        </button>
      </div>
      {draft && (
        <p className="mt-5">
          <Link href={draft.adminURL} className="underline">
            Relire l’article dans Payload →
          </Link>
        </p>
      )}
      {publication?.url && (
        <div role="status" className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <p className="font-semibold">Article publié avec succès.</p>
          <Link href={publication.url} className="mt-3 block underline">
            Voir l’article français →
          </Link>
          <Link href={`/en/posts/${publication.slug}`} className="mt-2 block underline">
            Voir l’article anglais →
          </Link>
        </div>
      )}
      <EditSummary />
      <section
        aria-label="Journal de publication"
        className="mt-8 rounded-lg border border-slate-200 p-6"
      >
        <h2 className="font-semibold">Suivi de la publication</h2>
        <div role="log" aria-live="polite">
          {messages.map((message, index) => (
            <p className="mt-3 text-sm" key={index}>
              {message}
            </p>
          ))}
        </div>
      </section>
    </main>
  )
}
