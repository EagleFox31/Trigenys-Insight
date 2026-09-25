import type { EditorialChartBlock } from '@/payload-types'
import { InteractiveChart } from './InteractiveChart'

export function ChartBlock(props: EditorialChartBlock & { className?: string }) {
  const sourceUrl = props.sourceUrl?.startsWith('https://') ? props.sourceUrl : undefined
  return (
    <figure className={props.className}>
      <InteractiveChart
        title={props.title}
        description={props.description}
        metrics={props.metrics.map((metric) => ({
          label: metric.label,
          unit: metric.unit,
          precision: metric.precision,
          points: metric.points.map((point) => ({ label: point.label, value: point.value })),
        }))}
      />
      <figcaption className="mx-auto mt-3 max-w-[48rem] text-sm text-muted-foreground">
        {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{props.sourceLabel}</a> : props.sourceLabel}
      </figcaption>
    </figure>
  )
}
