'use client'

import { useId, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  goalChoices,
  journeyCopy,
  journeySources,
  originChoices,
  resolveJourney,
  walletChoices,
  type EvidenceStatus,
  type Goal,
  type Origin,
  type Wallet,
} from './journeyData'

type Props = {
  title?: string
  description?: string
}

const levels: Record<EvidenceStatus, string> = {
  documented: 'border-emerald-600/40 bg-emerald-700/10 text-emerald-800 dark:text-emerald-300',
  conditional: 'border-amber-600/40 bg-amber-500/10 text-amber-900 dark:text-amber-300',
  unknown: 'border-border bg-muted text-foreground',
}

function StatusPill({ value, text }: { value: EvidenceStatus; text: string }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${levels[value]}`}>
      {text}
    </span>
  )
}

type ChoiceColumn<T extends string> = {
  legend: string
  values: readonly T[]
  selected: T
  labels: Record<T, string>
  onSelect: (value: T) => void
  labelId: string
}

function ChoiceColumn<T extends string>({
  legend, values, selected, labels, onSelect, labelId,
}: ChoiceColumn<T>) {
  return (
    <fieldset aria-labelledby={labelId} className="relative z-10 m-0 min-w-0 space-y-3 border-0 p-0">
      <legend id={labelId} className="mb-4 block min-h-9 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {legend}
      </legend>
      {values.map((value) => {
        const chosen = selected === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={chosen}
            onClick={() => onSelect(value)}
            className={`flex min-h-[58px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 motion-reduce:transition-none sm:px-4 ${
              chosen
                ? 'border-emerald-600 bg-emerald-700 text-white shadow-md dark:bg-emerald-700'
                : 'border-border bg-background text-foreground hover:border-emerald-600/50 hover:bg-muted'
            }`}
          >
            <span className="min-w-0 break-words">{labels[value]}</span>
            {chosen && <span aria-hidden="true" className="text-lg leading-none">✓</span>}
          </button>
        )
      })}
    </fieldset>
  )
}

function FlowLinks({ originIndex, walletIndex, goalIndex, unknown }: {
  originIndex: number
  walletIndex: number
  goalIndex: number
  unknown: boolean
}) {
  const y = (index: number) => 84 + index * 70
  const first = `M 314 ${y(originIndex)} C 326 ${y(originIndex)}, 340 ${y(walletIndex)}, 350 ${y(walletIndex)}`
  const second = `M 648 ${y(walletIndex)} C 660 ${y(walletIndex)}, 674 ${y(goalIndex)}, 685 ${y(goalIndex)}`
  return (
    <svg
      className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible sm:block"
      viewBox="0 0 1000 385"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {[first, second].map((path, index) => (
        <g key={index}>
          <path d={path} stroke="currentColor" strokeOpacity="0.09" strokeWidth="15" fill="none" />
          <path
            d={path}
            stroke={unknown && index === 1 ? '#b45309' : '#19845d'}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={unknown && index === 1 ? '8 6' : undefined}
          />
        </g>
      ))}
    </svg>
  )
}

/**
 * A decision-flow explorer, not a Sankey: line thickness does NOT imply volume.
 * Accessible buttons own interaction; SVG connectors are decorative.
 */
export function MoneyFlowExplorer({ title, description }: Props) {
  const pathname = usePathname()
  const locale = pathname.startsWith('/en/') || pathname === '/en' ? 'en' : 'fr'
  const copy = journeyCopy[locale]
  const id = useId()
  const [origin, setOrigin] = useState<Origin>('france')
  const [wallet, setWallet] = useState<Wallet>('orange')
  const [goal, setGoal] = useState<Goal>('school')
  const result = resolveJourney(origin, wallet, goal)
  const sources = [...new Set([...result.incoming.sources, ...result.outgoing.sources])]

  const reset = () => {
    setOrigin('france')
    setWallet('orange')
    setGoal('school')
  }

  return (
    <section
      className="not-prose relative my-10 overflow-hidden rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-7 lg:p-9"
      aria-labelledby={`${id}-title`}
    >
      <div className="relative z-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.17em] text-emerald-700 dark:text-emerald-400">
          Trigenys Insight · Explorer
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h3 id={`${id}-title`} className="m-0 text-balance text-xl font-bold leading-snug sm:text-2xl">
              {title || (locale === 'fr' ? 'Où peut aller mon argent ?' : 'Where can my money go?')}
            </h3>
            <p className="mb-0 mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {description || copy.intro}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            {copy.reset}
          </button>
        </div>
      </div>

      <div className="relative mt-7">
        <FlowLinks
          originIndex={originChoices.indexOf(origin)}
          walletIndex={walletChoices.indexOf(wallet)}
          goalIndex={goalChoices.indexOf(goal)}
          unknown={result.overall === 'unknown'}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-[7%]">
          <ChoiceColumn
            legend={copy.stages[0]}
            values={originChoices}
            selected={origin}
            labels={copy.origins}
            onSelect={setOrigin}
            labelId={`${id}-origin`}
          />
          <div className="mx-auto flex items-center text-xl text-emerald-700 sm:hidden" aria-hidden="true">↓</div>
          <ChoiceColumn
            legend={copy.stages[1]}
            values={walletChoices}
            selected={wallet}
            labels={copy.wallets}
            onSelect={setWallet}
            labelId={`${id}-wallet`}
          />
          <div className="mx-auto flex items-center text-xl text-emerald-700 sm:hidden" aria-hidden="true">↓</div>
          <ChoiceColumn
            legend={copy.stages[2]}
            values={goalChoices}
            selected={goal}
            labels={copy.goals}
            onSelect={setGoal}
            labelId={`${id}-goal`}
          />
        </div>
      </div>

      <div className="relative mt-7 rounded-2xl border border-border bg-background/90 p-4 sm:p-6" aria-live="polite" aria-atomic="true">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h4 className="m-0 text-base font-semibold">{copy.title}</h4>
          <StatusPill value={result.overall} text={copy.status[result.overall]} />
        </div>
        <ol className="m-0 grid gap-4 p-0 sm:grid-cols-2">
          {[
            { title: copy.step1, stage: result.incoming },
            { title: copy.step2, stage: result.outgoing },
          ].map(({ title: stepTitle, stage }) => (
            <li className="list-none rounded-xl border border-border bg-card p-4" key={stepTitle}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <strong className="text-sm">{stepTitle}</strong>
                <StatusPill value={stage.status} text={copy.status[stage.status]} />
              </div>
              <p className="m-0 text-sm leading-relaxed">{stage.note[locale]}</p>
            </li>
          ))}
        </ol>
        {sources.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <h5 className="m-0 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{copy.sources}</h5>
            <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0">
              {sources.map((key) => (
                <li key={key}>
                  <a
                    href={journeySources[key].href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-emerald-700 underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-emerald-600 dark:text-emerald-300"
                  >
                    {journeySources[key].label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="mb-0 mt-4 text-xs leading-relaxed text-muted-foreground">{copy.footnote}</p>
    </section>
  )
}
