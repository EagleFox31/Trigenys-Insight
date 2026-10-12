import type { Metadata } from 'next'
import { MoneyFlowLab } from '@/components/insights/MoneyFlowLab'

export const metadata: Metadata = {
  title: 'Lab: Cameroon payment journeys | Trigenys Insight',
  description: 'Unpublished editorial prototype of sourced payment paths in Cameroon.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <MoneyFlowLab locale="en" />
}
