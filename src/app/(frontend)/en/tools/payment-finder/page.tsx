import type {Metadata} from 'next'
import {PaymentFinderEnglish} from '@/components/payment-finder/PaymentFinderEnglish'

export const metadata:Metadata={
  title:'Cameroon Payment Gateway Finder: compare 63 payment leads | Trigenys Insight',
  description:'A guided, source-aware comparison of 63 Cameroon payment-related leads: Mobile Money, bank cards, APIs, onboarding and published collection fees.',
  robots:{index:false,follow:false},
}
export default function EnglishPaymentFinderPage(){
  return <main className="min-h-screen px-4 py-10 sm:px-8 sm:py-16">
    <PaymentFinderEnglish/>
    <p className="mx-auto mt-7 max-w-4xl text-center text-sm text-muted-foreground">
      October 2026 editorial prototype. Production access, licensing, support quality and current fees must be confirmed with each provider.
    </p>
  </main>
}
