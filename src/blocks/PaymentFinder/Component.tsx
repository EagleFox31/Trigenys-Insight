import { PaymentFinder } from '@/components/payment-finder/PaymentFinder'

export type PaymentFinderBlockProps = {
  blockType:'paymentFinder'
  dataset:'cameroon-oct-2026'
  blockName?:string|null
}

export function PaymentFinderBlock({dataset}:PaymentFinderBlockProps) {
  if(dataset!=='cameroon-oct-2026') return null
  return <PaymentFinder embedded />
}
