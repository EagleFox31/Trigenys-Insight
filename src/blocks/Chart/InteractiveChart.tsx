'use client'

import { useId, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import {
  chartScale,
  chartToCsv,
  filterChartPoints,
  type ChartMetric,
  type ChartSort,
} from './chartData'

type Props = {
  title: string
  description: string
  metrics: ChartMetric[]
}

export function InteractiveChart({ title, description, metrics }: Props) {
  const [selected, setSelected] = useState(0)
  const [activePoint, setActivePoint] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<ChartSort>('source')
  const locale = usePathname().startsWith('/en') ? 'en' : 'fr'
  const id = useId()
  const metric = metrics[selected]
  const points = useMemo(
    () => (metric ? filterChartPoints(metric.points, query, sort, locale) : []),
    [metric, query, sort, locale],
  )

  if (!metric || !metric.points.length) return null

  const precision = Math.max(0, Math.min(2, Math.trunc(metric.precision)))
  const numberFormat = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  })
  const scale = chartScale(points)
  const label = (fr: string, en: string) => locale === 'fr' ? fr : en

  function exportCsv() {
    const csv = chartToCsv(metric, points, locale)
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `trigenys-insight-chart-${selected + 1}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-[48rem] border-y border-border py-6" aria-describedby={`${id}-desc`}>
      <h3 className="m-0 text-xl font-semibold text-foreground">{title}</h3>
      <p id={`${id}-desc`} className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>

      {metrics.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={label('Mesure affichée', 'Displayed measure')}>
          {metrics.map((item, index) => (
            <button
              key={index}
              type="button"
              aria-pressed={selected === index}
              onClick={() => {
                setSelected(index)
                setActivePoint(null)
                setQuery('')
                setSort('source')
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                selected === index
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        {metric.points.length >= 5 && (
          <div className="min-w-[11rem] flex-1">
            <label htmlFor={`${id}-search`} className="mb-1 block text-xs font-medium text-muted-foreground">
              {label('Filtrer les catégories', 'Filter categories')}
            </label>
            <input
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActivePoint(null) }}
              placeholder={label('Ex. année ou service', 'E.g. year or service')}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>
        )}
        {metric.points.length >= 3 && (
          <div className="min-w-[10rem]">
            <label htmlFor={`${id}-sort`} className="mb-1 block text-xs font-medium text-muted-foreground">
              {label('Trier par', 'Sort by')}
            </label>
            <select
              id={`${id}-sort`}
              value={sort}
              onChange={(event) => { setSort(event.target.value as ChartSort); setActivePoint(null) }}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <option value="source">{label('Ordre de la source', 'Source order')}</option>
              <option value="descending">{label('Valeur décroissante', 'Highest first')}</option>
              <option value="ascending">{label('Valeur croissante', 'Lowest first')}</option>
            </select>
          </div>
        )}
      </div>

      <div className="mt-5 text-sm font-medium text-foreground">{metric.label} · {metric.unit}</div>
      <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">
        {label('Catégories affichées', 'Visible categories')} : {points.length} / {metric.points.length}
      </p>

      {points.length === 0 ? (
        <p role="status" className="mt-5 rounded-lg bg-muted px-4 py-5 text-sm text-muted-foreground">
          {label('Aucune catégorie ne correspond à ce filtre.', 'No categories match this filter.')}
        </p>
      ) : (
        <div
          className="relative mt-4 space-y-4"
          role="group"
          aria-label={`${metric.label} (${metric.unit}) : ${points.map((point) => `${point.label} ${numberFormat.format(point.value)}`).join(', ')}`}
        >
          {points.map((point, index) => {
            const valuePosition = ((point.value - scale.lower) / scale.span) * 100
            const start = Math.min(scale.zeroPercent, valuePosition)
            const width = Math.abs(point.value / scale.span) * 100
            return (
              <button
                type="button"
                key={`${point.label}-${index}`}
                onMouseEnter={() => setActivePoint(index)}
                onMouseLeave={() => setActivePoint(null)}
                onFocus={() => setActivePoint(index)}
                onBlur={() => setActivePoint(null)}
                onClick={() => setActivePoint(activePoint === index ? null : index)}
                aria-label={`${point.label} : ${numberFormat.format(point.value)} ${metric.unit}`}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)_auto]"
              >
                <span className="min-w-0 break-words text-foreground">{point.label}</span>
                <span
                  className="relative col-span-2 row-start-2 block h-8 min-w-0 bg-muted/60 sm:col-span-1 sm:col-start-2 sm:row-start-1"
                  aria-hidden="true"
                >
                  <span className="absolute inset-y-0 w-px bg-border" style={{ left: `${scale.zeroPercent}%` }} />
                  <span
                    className={`absolute inset-y-1.5 bg-[#e07520] transition-opacity motion-reduce:transition-none ${
                      activePoint === null || activePoint === index ? 'opacity-100' : 'opacity-60'
                    }`}
                    style={{ left: `${start}%`, width: `${width}%` }}
                  />
                </span>
                <span className="text-right tabular-nums text-foreground sm:col-start-3">
                  {numberFormat.format(point.value)} {metric.unit}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
        <button
          type="button"
          aria-expanded={showTable}
          aria-controls={`${id}-table`}
          onClick={() => setShowTable(!showTable)}
          className="text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {showTable ? label('Masquer les données', 'Hide data') : label('Voir les données', 'View data')}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={points.length === 0}
          className="text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {label('Télécharger en CSV', 'Download CSV')}
        </button>
      </div>

      <div id={`${id}-table`}>
        {showTable && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{metric.label} ({metric.unit})</caption>
              <thead>
                <tr>
                  <th scope="col" className="py-2 pr-2">{label('Catégorie', 'Category')}</th>
                  <th scope="col" className="py-2 text-right">{metric.label} ({metric.unit})</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point, index) => (
                  <tr key={index} className="border-t border-border">
                    <th scope="row" className="py-2 pr-2 font-normal">{point.label}</th>
                    <td className="py-2 text-right tabular-nums">{numberFormat.format(point.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
