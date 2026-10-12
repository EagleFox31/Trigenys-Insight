import { MoneyFlowExplorer } from './MoneyFlowExplorer'

export type MoneyFlowBlockProps = {
  blockType: 'moneyFlow'
  title: string
  description: string
  dataset: 'cameroon-payments-oct-2026'
  blockName?: string | null
}

export function MoneyFlowBlock({ title, description, dataset }: MoneyFlowBlockProps) {
  if (dataset !== 'cameroon-payments-oct-2026') return null
  return <MoneyFlowExplorer title={title} description={description} />
}
