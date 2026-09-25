'use client'

import { useId, useState } from 'react'
import { usePathname } from 'next/navigation'

type Metric = {
  label: string
  unit: string
  precision: number
  points: { label: string; value: number }[]
}

export function InteractiveChart({ title, description, metrics }: { title: string; description: string; metrics: Metric[] }) {
  const [selected, setSelected] = useState(0)
  const [activePoint, setActivePoint] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const isEnglish = usePathname().startsWith('/en')
  const id = useId()
  const metric = metrics[selected]
  if (!metric || !metric.points.length) return null

  const nf = new Intl.NumberFormat(isEnglish ? 'en-GB' : 'fr-FR', { maximumFractionDigits: metric.precision, minimumFractionDigits: metric.precision })
  const values = metric.points.map((point) => point.value)
  const lower = Math.min(0, ...values)
  const upper = Math.max(0, ...values)
  const span = upper - lower || 1
  const zero = ((0 - lower) / span) * 100

  return (
    <div className="mx-auto max-w-[48rem] border-y border-border py-6" aria-describedby={`${id}-desc`}>
      <h3 className="m-0 text-xl font-semibold text-foreground">{title}</h3>
      <p id={`${id}-desc`} className="mt-2 text-sm text-muted-foreground">{description}</p>
      {metrics.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={isEnglish ? 'Displayed measure' : 'Mesure affichée'}>
          {metrics.map((item, index) => (
            <button key={index} type="button" aria-pressed={selected === index} onClick={() => { setSelected(index); setActivePoint(null) }}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected === index ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted'}`}>
              {item.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-6 text-sm font-medium text-foreground">{metric.label} · {metric.unit}</div>
      <div className="relative mt-4 space-y-4" role="group" aria-label={`${metric.label} (${metric.unit}) : ${metric.points.map((point) => `${point.label} ${nf.format(point.value)}`).join(', ')}`}>
        {metric.points.map((point, index) => {
          const start = Math.min(zero, ((point.value - lower) / span) * 100)
          const length = Math.abs(point.value / span) * 100
          return (
            <button type="button" key={`${point.label}-${index}`} onMouseEnter={() => setActivePoint(index)} onMouseLeave={() => setActivePoint(null)} onFocus={() => setActivePoint(index)} onBlur={() => setActivePoint(null)} onClick={() => setActivePoint(activePoint === index ? null : index)}
              aria-label={`${point.label} : ${nf.format(point.value)} ${metric.unit}`}
              className="grid w-full grid-cols-[5rem_minmax(0,1fr)_7rem] items-center gap-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:grid-cols-[8rem_minmax(0,1fr)_9rem]">
              <span className="truncate text-foreground" title={point.label}>{point.label}</span>
              <span className="relative block h-8 bg-muted/60">
                <span className="absolute inset-y-0 w-px bg-border" style={{ left: `${zero}%` }} />
                <span className={`absolute inset-y-1.5 bg-[#e07520] transition-opacity ${activePoint === null || activePoint === index ? 'opacity-100' : 'opacity-60'}`} style={{ left: `${start}%`, width: `${length}%` }} />
              </span>
              <span className="text-right tabular-nums text-foreground">{nf.format(point.value)} {metric.unit}</span>
            </button>
          )
        })}
      </div>
      <button type="button" aria-expanded={showTable} onClick={() => setShowTable(!showTable)} className="mt-5 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary">
        {showTable ? (isEnglish ? 'Hide data' : 'Masquer les données') : (isEnglish ? 'View data' : 'Voir les données')}
      </button>
      {showTable && <table className="mt-3 w-full text-left text-sm"><caption className="sr-only">{metric.label} ({metric.unit})</caption><thead><tr><th scope="col" className="py-2">{isEnglish ? 'Period' : 'Période'}</th><th scope="col" className="py-2 text-right">{metric.label} ({metric.unit})</th></tr></thead><tbody>{metric.points.map((point, index) => <tr key={index} className="border-t border-border"><th scope="row" className="py-2 font-normal">{point.label}</th><td className="py-2 text-right tabular-nums">{nf.format(point.value)}</td></tr>)}</tbody></table>}
    </div>
  )
}
