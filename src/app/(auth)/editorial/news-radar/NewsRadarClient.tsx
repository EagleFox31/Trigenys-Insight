'use client'

import {
  Check,
  Clock3,
  Eye,
  FilePenLine,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import type { GateOutcome, OperatorRunSummary } from '@/utilities/editorialOperator'

type Props = {
  initialRuns: OperatorRunSummary[]
  operatorName: string
}

function urgencyLabel(value: string | null) {
  if (value === 'HIGH') return 'Prioritaire'
  if (value === 'LOW') return 'Faible'
  return 'Normale'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function NewsRadarClient({ initialRuns, operatorName }: Props) {
  const router = useRouter()
  const [busyRun, setBusyRun] = useState<string | null>(null)
  const [revisionRun, setRevisionRun] = useState<string | null>(null)
  const [revisionText, setRevisionText] = useState('')
  const [message, setMessage] = useState('')

  const metrics = useMemo(() => {
    const high = initialRuns.filter((run) => run.topic_urgency === 'HIGH').length
    const sources = new Set(initialRuns.flatMap((run) => run.topic_sources)).size
    return { high, sources }
  }, [initialRuns])

  async function decide(
    run: OperatorRunSummary,
    outcome: GateOutcome,
    options?: { reason?: string; requestedAngle?: string },
  ) {
    setBusyRun(run.id)
    setMessage('')

    try {
      const response = await fetch(
        `/api/editorial/news-radar/${encodeURIComponent(run.id)}/gate`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outcome,
            reason: options?.reason,
            requestedAngle: options?.requestedAngle,
          }),
        },
      )

      if (!response.ok) {
        throw new Error('La décision n’a pas pu être enregistrée.')
      }

      setRevisionRun(null)
      setRevisionText('')
      setMessage(
        outcome === 'APPROVED'
          ? 'Sujet approuvé. Il peut passer en recherche.'
          : outcome === 'WATCH'
            ? 'Sujet placé en veille.'
            : outcome === 'REJECTED'
              ? 'Sujet rejeté.'
              : 'Nouvel angle demandé.',
      )
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action impossible.')
    } finally {
      setBusyRun(null)
    }
  }

  return (
    <main className="radar-shell">
      <aside className="radar-sidebar">
        <a className="radar-brand" href="/admin">
          <span className="radar-brand__mark">T</span>
          <span>
            <strong>TRIGENYS</strong>
            <em>INSIGHTS</em>
          </span>
        </a>

        <nav className="radar-nav" aria-label="Navigation éditoriale">
          <a className="radar-nav__item radar-nav__item--active" href="/editorial/news-radar">
            <Sparkles size={18} />
            News Radar
          </a>
          <a className="radar-nav__item" href="/admin">
            <FilePenLine size={18} />
            Articles & CMS
          </a>
        </nav>

        <div className="radar-sidebar__footer">
          <span className="radar-avatar">{operatorName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{operatorName}</strong>
            <small>Éditeur connecté</small>
          </div>
        </div>
      </aside>

      <section className="radar-workspace">
        <header className="radar-header">
          <div>
            <p className="radar-eyebrow">EDITORIAL OPERATIONS</p>
            <h1>News Radar</h1>
            <p>
              Les sujets proposés par le Scout arrivent ici. Rien ne part en rédaction sans
              validation Gate A.
            </p>
          </div>

          <button className="radar-refresh" onClick={() => router.refresh()} type="button">
            <RefreshCw size={17} />
            Actualiser
          </button>
        </header>

        <section className="radar-metrics" aria-label="Résumé du radar">
          <article>
            <span>À valider</span>
            <strong>{initialRuns.length}</strong>
            <small>Gate A</small>
          </article>
          <article>
            <span>Prioritaires</span>
            <strong>{metrics.high}</strong>
            <small>Urgence haute</small>
          </article>
          <article>
            <span>Sources visibles</span>
            <strong>{metrics.sources}</strong>
            <small>sur la shortlist</small>
          </article>
          <article>
            <span>Collecte</span>
            <strong>30 min</strong>
            <small>GitHub Actions</small>
          </article>
        </section>

        <div className="radar-section-heading">
          <div>
            <span className="radar-section-heading__icon">
              <ShieldCheck size={19} />
            </span>
            <div>
              <h2>Sujets proposés</h2>
              <p>Politique active : 2026.10-pilot.2</p>
            </div>
          </div>
          <span className="radar-count">{initialRuns.length}</span>
        </div>

        {message ? <p className="radar-message">{message}</p> : null}

        {initialRuns.length === 0 ? (
          <div className="radar-empty">
            <Sparkles size={26} />
            <h3>Aucun sujet n’attend ta validation.</h3>
            <p>Le Scout continuera à collecter et le Radar remplira cette file automatiquement.</p>
          </div>
        ) : (
          <div className="radar-list">
            {initialRuns.map((run) => {
              const isBusy = busyRun === run.id
              const editing = revisionRun === run.id

              return (
                <article className="radar-card" key={run.id}>
                  <div className="radar-card__meta">
                    <span className={`radar-urgency radar-urgency--${run.topic_urgency?.toLowerCase() || 'normal'}`}>
                      <Clock3 size={14} />
                      {urgencyLabel(run.topic_urgency)}
                    </span>
                    <span className="radar-score">
                      Score <strong>{run.topic_composite_score ?? '—'}</strong>
                    </span>
                    <span>{formatDate(run.updated_at)}</span>
                  </div>

                  <div className="radar-card__body">
                    <div>
                      <h3>{run.topic_title || 'Sujet sans titre'}</h3>
                      <p className="radar-angle">
                        {run.topic_proposed_angle || 'Angle éditorial à préciser.'}
                      </p>
                    </div>
                    <span className="radar-format">{run.topic_proposed_format || 'article'}</span>
                  </div>

                  <div className="radar-sources">
                    <span>Sources</span>
                    {run.topic_sources.length ? (
                      run.topic_sources.map((source) => <em key={source}>{source}</em>)
                    ) : (
                      <em>Source Scout</em>
                    )}
                  </div>

                  {editing ? (
                    <div className="radar-revision">
                      <label htmlFor={`angle-${run.id}`}>Nouvel angle demandé</label>
                      <textarea
                        autoFocus
                        id={`angle-${run.id}`}
                        onChange={(event) => setRevisionText(event.target.value)}
                        placeholder="Ex. Recentrer sur l’impact pour les PME camerounaises…"
                        rows={3}
                        value={revisionText}
                      />
                      <div>
                        <button
                          className="radar-button radar-button--secondary"
                          onClick={() => {
                            setRevisionRun(null)
                            setRevisionText('')
                          }}
                          type="button"
                        >
                          Annuler
                        </button>
                        <button
                          className="radar-button radar-button--primary"
                          disabled={!revisionText.trim() || isBusy}
                          onClick={() =>
                            decide(run, 'REVISION_REQUESTED', {
                              reason: 'Angle éditorial à réviser.',
                              requestedAngle: revisionText.trim(),
                            })
                          }
                          type="button"
                        >
                          Envoyer la révision
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="radar-actions">
                      <button
                        className="radar-button radar-button--primary"
                        disabled={isBusy}
                        onClick={() => decide(run, 'APPROVED', { reason: 'Validé depuis News Radar.' })}
                        type="button"
                      >
                        <Check size={16} />
                        Approuver
                      </button>
                      <button
                        className="radar-button radar-button--secondary"
                        disabled={isBusy}
                        onClick={() => {
                          setRevisionRun(run.id)
                          setRevisionText(run.topic_proposed_angle || '')
                        }}
                        type="button"
                      >
                        <FilePenLine size={16} />
                        Modifier l’angle
                      </button>
                      <button
                        className="radar-button radar-button--ghost"
                        disabled={isBusy}
                        onClick={() => decide(run, 'WATCH', { reason: 'Conserver en veille.' })}
                        type="button"
                      >
                        <Eye size={16} />
                        Watch
                      </button>
                      <button
                        className="radar-button radar-button--danger"
                        disabled={isBusy}
                        onClick={() => decide(run, 'REJECTED', { reason: 'Hors ligne éditoriale.' })}
                        type="button"
                      >
                        <X size={16} />
                        Rejeter
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
