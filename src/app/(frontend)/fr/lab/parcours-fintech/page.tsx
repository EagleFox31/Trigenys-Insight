import type { Metadata } from 'next'
import { MoneyFlowLab } from '@/components/insights/MoneyFlowLab'

export const metadata: Metadata = {
  title: 'Laboratoire : parcours de paiement au Cameroun | Trigenys Insight',
  description: 'Prototype d’exploration interactive des parcours financiers documentés au Cameroun.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <MoneyFlowLab locale="fr" />
}
