import Link from 'next/link'
import { MoneyFlowExplorer } from '@/blocks/MoneyFlow/MoneyFlowExplorer'

export function MoneyFlowLab({ locale }: { locale: 'fr' | 'en' }) {
  const fr = locale === 'fr'
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-20">
      <header className="mb-10 max-w-3xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-emerald-700 dark:text-emerald-400">
          Trigenys Insight · {fr ? 'Laboratoire éditorial' : 'Editorial lab'}
        </p>
        <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-5xl">
          {fr ? 'Fintech au Cameroun : jusqu’où va notre argent ?' : 'Cameroon fintech: where can your money go?'}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          {fr
            ? 'Avant de comparer les fintechs, explorons les trajets de paiement réellement documentés. Le parcours ci-dessous n’est ni un calculateur de tarifs ni une garantie qu’une opération sera possible.'
            : 'Before comparing fintech providers, explore documented payment journeys. This is not a live fee calculator or a guarantee that any payment route will work.'}
        </p>
        <p className="mt-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm">
          {fr
            ? 'Prototype éditorial — ce dossier n’a pas encore passé la vérification finale ni les validations de publication.'
            : 'Editorial prototype — this investigation has not yet passed final fact-checking or publication approval.'}
        </p>
      </header>
      <MoneyFlowExplorer
        title={fr ? 'D’où vient l’argent, et que peut-on en faire ?' : 'Where does money come from, and how can it be used?'}
        description={fr
          ? 'Choisissez une origine, un mode de réception et un usage. Les lignes indiquent votre sélection, pas une compatibilité automatique entre tous les services.'
          : 'Select an origin, a delivery method and a purpose. Lines show your choices, not automatic compatibility between all services.'}
      />
      <section className="mt-12 max-w-3xl space-y-5 text-base leading-7">
        <h2 className="text-2xl font-semibold">
          {fr ? 'Pourquoi ces différences comptent' : 'Why these differences matter'}
        </h2>
        <p>
          {fr
            ? 'Recevoir de l’argent de France vers un portefeuille mobile, payer une école participante et convertir ses fonds vers un actif crypto ne relèvent pas des mêmes circuits ni des mêmes règles. Une étape documentée ne garantit jamais que toute la chaîne est accessible à tout le monde.'
            : 'Receiving money from France into a mobile wallet, paying a participating school and converting funds into a cryptoasset are distinct services subject to different rules. A documented step never guarantees the entire journey will work for everyone.'}
        </p>
        <p>
          {fr
            ? 'L’enquête finale confrontera ces annonces à des utilisateurs, aux tarifs datés et à la réglementation. Pour l’instant, nous montrons ce qui est sourcé et ce qui reste à vérifier.'
            : 'The final investigation will verify provider statements against user experiences, dated fees and regulations. For now, this explorer distinguishes sourced services from unknowns.'}
        </p>
      </section>
      <div className="mt-10">
        <Link href={fr ? '/fr/posts' : '/en/posts'} className="text-sm font-medium text-emerald-700 underline underline-offset-4 dark:text-emerald-300">
          {fr ? 'Retour aux analyses' : 'Back to articles'}
        </Link>
      </div>
    </main>
  )
}
