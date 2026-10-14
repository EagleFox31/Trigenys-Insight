'use client'

import { useState } from 'react'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { InsightClient, type UpdatePostResult } from '../../../../../packages/insight-automation/src/index'
import { sameArticleContent } from '@/editorial/sameArticleContent'

export function EditCategories() {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [current, setCurrent] = useState<number[]>([])
  const sdk = () => new InsightClient({ baseURL: window.location.origin, session: true, timeoutMs: 60000 })
  async function run(save: boolean) {
    setPending(true)
    const mcp = new Client({ name: 'trigenys-category-editor', version: '0.1.0' })
    try {
      const client = sdk()
      const before = (await client.getPostById(8, 'fr')).post
      const beforeEN = (await client.getPostById(8, 'en')).post
      if (before.slug !== 'whisp-wetransfer-swisstransfer-cameroun') throw new Error('Article inattendu')
      const refs = await client.listCategories('fr')
      const target = refs.docs.find((category) => category.slug === 'made-in-africa')
      if (!target) throw new Error('Rubrique Made in Africa introuvable')
      const previous = before.categories as number[]
      setCurrent(previous)
      setLoaded(true)
      if (!save) {
        setMessage(`Article 8 : ${String(before.title)}. Statut : ${String(before._status)}. Rubriques : ${previous.map((id) => refs.docs.find((category) => category.id === id)?.title ?? id).join(', ')}.`)
        return
      }
      const categories = [target.id, ...previous.filter((id) => ![target.id, 5, 6].includes(id))]
      await mcp.connect(new StreamableHTTPClientTransport(new URL('/api/mcp', window.location.origin), { requestInit: { credentials: 'same-origin' } }))
      const result = await mcp.callTool({ name: 'insight_update_post', arguments: {
        postId: 8, locale: 'fr', categories, status: 'PUBLISHED', expectedUpdatedAt: String(before.updatedAt),
      } })
      if (result.isError) throw new Error(JSON.stringify(result.content))
      const updated = result.structuredContent as UpdatePostResult | undefined
      if (!updated?.ok || updated.id !== 8) throw new Error('Modification non confirmée')
      for (const locale of ['fr', 'en'] as const) {
        const after = (await client.getPostById(8, locale)).post
        if (JSON.stringify(after.categories) !== JSON.stringify(categories)) throw new Error('Rubriques non enregistrées')
        const original = locale === 'fr' ? before : beforeEN
        if (!sameArticleContent(original.content, after.content) || original.heroImage !== after.heroImage || after._status !== 'published' || original.title !== after.title || original.excerpt !== after.excerpt) throw new Error('Vérification du contenu impossible')
      }
      setCurrent(categories)
      setMessage('Modification MCP réussie sur Whisp (article 8). Made in Africa est la rubrique principale ; anciennes rubriques Consommer remplacées, autres rubriques conservées. Publication rétablie. Relecture SDK FR/EN réussie : contenu et image conservés.')
    } catch (error) {
      setMessage(`Erreur : ${error instanceof Error ? error.message : 'Modification impossible'}`)
    } finally {
      await mcp.close().catch(() => undefined)
      setPending(false)
    }
  }
  return <section className="mt-10 rounded-lg border border-slate-200 p-6">
    <h2 className="text-xl font-semibold">Rubrique de l’article Whisp</h2>
    <p className="mt-3">Remplacer les anciennes rubriques Consommer par Made in Africa, conserver les autres rubriques et rétablir la publication de Whisp.</p>
    <button disabled={pending} onClick={() => run(false)} className="mt-4 rounded-md border px-4 py-2 disabled:opacity-50">Charger les rubriques de Whisp</button>
    <p className="mt-3 text-sm">Identifiants actuels : {current.join(', ') || 'À charger'}</p>
    <button disabled={pending || !loaded} onClick={() => run(true)} className="mt-4 rounded-md bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">{pending ? 'Opération de rubrique en cours…' : 'Rattacher Whisp à Made in Africa et rétablir sa publication via MCP'}</button>
    <p role="status" className="mt-4 text-sm">{message}</p>
  </section>
}
