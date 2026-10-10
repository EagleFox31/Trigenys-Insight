/**
 * Pure chart-data utilities. These do not depend on React or the browser.
 * No normalization or interpolation is used to invent missing prices/values.
 */
export type ChartPoint = {
  label: string
  value: number
}

export type ChartMetric = {
  label: string
  unit: string
  precision: number
  points: ChartPoint[]
}

export type ChartSort = 'source' | 'ascending' | 'descending'

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()
}

export function filterChartPoints(
  points: ChartPoint[],
  query: string,
  sort: ChartSort,
  locale: 'fr' | 'en',
): ChartPoint[] {
  const needle = normalizeText(query)
  const filtered = points.filter(
    (point) =>
      Number.isFinite(point.value) &&
      (needle === '' || normalizeText(point.label).includes(needle)),
  )
  if (sort === 'source') return filtered
  return [...filtered].sort(
    (a, b) =>
      (sort === 'ascending' ? a.value - b.value : b.value - a.value) ||
      a.label.localeCompare(b.label, locale),
  )
}

/** Escape both CSV delimiters and spreadsheet formula execution. */
function safeCsvField(value: string): string {
  const noFormula = /^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? `'${value}` : value
  return `"${noFormula.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
}

/**
 * Spreadsheet-friendly CSV with an explicit data unit and localized delimiter.
 * Return a raw string; the UI decides when to create a downloadable Blob.
 */
export function chartToCsv(
  metric: ChartMetric,
  points: ChartPoint[],
  locale: 'fr' | 'en',
): string {
  const separator = locale === 'fr' ? ';' : ','
  const headers = locale === 'fr' ? ['Catégorie', 'Valeur', 'Unité'] : ['Category', 'Value', 'Unit']
  const lines = [
    headers.map((value) => safeCsvField(value)).join(separator),
    ...points.map((point) =>
      [
        safeCsvField(point.label),
        Number.isFinite(point.value) ? String(point.value) : '',
        safeCsvField(metric.unit),
      ].join(separator),
    ),
  ]
  return lines.join('\r\n') + '\r\n'
}

export function chartScale(points: ChartPoint[]): { lower: number; upper: number; span: number; zeroPercent: number } {
  const values = points.map((point) => point.value).filter(Number.isFinite)
  const lower = Math.min(0, ...values)
  const upper = Math.max(0, ...values)
  const span = Math.max(upper - lower, 1)
  return { lower, upper, span, zeroPercent: ((0 - lower) / span) * 100 }
}
