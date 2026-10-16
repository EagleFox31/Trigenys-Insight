import type { Metadata } from 'next'
import { PaymentFinder } from '@/components/payment-finder/PaymentFinder'

export const metadata:Metadata = {
  title:'Comparateur des solutions de paiement au Cameroun | Trigenys Insight',
  description:'5 questions, un calculateur et 63 pistes pour trouver les solutions de paiement à examiner selon votre stack, votre budget et votre activité.',
  robots:{index:false,follow:false},
}
export default function Page(){
  return <main className="min-h-screen px-4 py-10 sm:px-8 sm:py-16">
    <PaymentFinder />
    <p className="mx-auto mt-7 max-w-4xl text-center text-sm text-muted-foreground">
      Prototype éditorial d’octobre 2026 — non validé par des paiements réels. Les informations sont indicatives et doivent être confirmées avant toute décision.
    </p>
  </main>
}
