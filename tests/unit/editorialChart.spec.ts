import { describe, expect, it } from 'vitest'

import { chartScale, chartToCsv, filterChartPoints } from '@/blocks/Chart/chartData'

const examples = [
  { label: 'Orange Money', value: 21000 },
  { label: 'PaySika', value: 19000 },
  { label: 'MTN MoMo', value: 20500 },
  { label: 'Épargne', value: 0 },
]

describe('interactive editorial charts: pure data utilities', () => {
  it('filters French labels independent of accents and leaves the input untouched', () => {
    const filtered = filterChartPoints(examples, 'epargne', 'source', 'fr')
    expect(filtered).toEqual([{ label: 'Épargne', value: 0 }])
    expect(examples).toHaveLength(4)
  })

  it('sorts in both directions and preserves the original order when requested', () => {
    expect(filterChartPoints(examples, '', 'descending', 'fr').map((p) => p.label)).toEqual([
      'Orange Money', 'MTN MoMo', 'PaySika', 'Épargne',
    ])
    expect(filterChartPoints(examples, '', 'ascending', 'fr')[0].label).toBe('Épargne')
    expect(filterChartPoints(examples, '', 'source', 'fr')).toEqual(examples)
  })

  it('never plots NaN or unbounded values as if they were genuine source figures', () => {
    expect(filterChartPoints([...examples, { label: 'Missing', value: Number.NaN }, { label: 'Infinity', value: Infinity }], '', 'source', 'en'))
      .toEqual(examples)
    expect(chartScale([])).toEqual({ lower: 0, upper: 0, span: 1, zeroPercent: 0 })
  })

  it('handles negative and zero values without division by zero', () => {
    expect(chartScale([{ label: 'fees', value: -5 }, { label: 'net', value: 5 }]))
      .toEqual({ lower: -5, upper: 5, span: 10, zeroPercent: 50 })
    expect(chartScale([{ label: 'none', value: 0 }]).span).toBe(1)
  })

  it('exports the visible filtered rows in French with a true numeric value and unit', () => {
    const csv = chartToCsv(
      { label: 'Montant', unit: 'XAF', precision: 0, points: examples },
      [examples[0]],
      'fr',
    )
    expect(csv).toContain('"Catégorie";"Valeur";"Unité"\r\n')
    expect(csv).toContain('"Orange Money";21000;"XAF"\r\n')
    expect(csv).not.toContain('PaySika')
  })

  it('escapes quotes, newlines, and Excel formula injection in exported category labels', () => {
    const csv = chartToCsv(
      { label: 'Value', unit: 'USD', precision: 2, points: [] },
      [{ label: '=IMPORTXML("http://example.invalid")\nunsafe', value: 2 }],
      'en',
    )
    expect(csv).toContain('"\'=IMPORTXML(""http://example.invalid"") unsafe",2,"USD"')
    expect(csv).not.toContain('"=IMPORTXML')
    expect(csv).toContain('"Category","Value","Unit"')
  })
})
