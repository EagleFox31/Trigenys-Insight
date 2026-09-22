import type { EditorialAnalyticsEvent } from './events'

export type ReadingMilestoneEvent =
  | 'article_read_25'
  | 'article_read_50'
  | 'article_read_75'
  | 'article_read_complete'

const milestones: Array<{ threshold: number; event: ReadingMilestoneEvent }> = [
  { threshold: 0.25, event: 'article_read_25' },
  { threshold: 0.5, event: 'article_read_50' },
  { threshold: 0.75, event: 'article_read_75' },
  { threshold: 0.95, event: 'article_read_complete' },
]

export function readingEventsToEmit(
  progress: number,
  fired: ReadonlySet<EditorialAnalyticsEvent>,
): ReadingMilestoneEvent[] {
  const normalized = Math.min(1, Math.max(0, progress))

  return milestones
    .filter(({ threshold, event }) => normalized >= threshold && !fired.has(event))
    .map(({ event }) => event)
}
