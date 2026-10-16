'use client'

import { useId, useState, type FormEvent } from 'react'
import { Calculator } from 'lucide-react'
import { railLabels, type PaymentMethod, type PaymentSimulation } from './catalog'

const XAF = new Intl.NumberFormat('fr-CM', {maximumFractionDigits:0})

export function CalculatorInputs({rails, simulation, onSimulate}: {
  rails: PaymentMethod[]; simulation: PaymentSimulation | null; onSimulate: (value: PaymentSimulation) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState(() => Object.fromEntries(rails.map(rail => {
    const previous = simulation?.channels.find(channel => channel.rail === rail)
    return [rail, {count:String(previous?.count ?? 100), amount:String(previous?.amountXaf ?? 10000)}]
  })))
  const [error, setError] = useState('')
  const dirty = !simulation || rails.some(rail => {
    const channel = simulation.channels.find(channel => channel.rail === rail)
    return !channel || Number(draft[rail].count) !== channel.count || Number(draft[rail].amount) !== channel.amountXaf
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const channels = rails.map(rail => ({rail, count:Number(draft[rail].count), amountXaf:Number(draft[rail].amount)}))
    if (channels.some(channel => !Number.isSafeInteger(channel.count) || channel.count < 1 || channel.count > 100000 || !Number.isSafeInteger(channel.amountXaf) || channel.amountXaf < 1 || channel.amountXaf > 100000000)) {
      setError('Saisis de 1 à 100 000 paiements et un montant entier de 1 à 100 000 000 FCFA par paiement.')
      return
    }
    setError('')
    onSimulate({channels})
  }

  return <form onSubmit={submit} noValidate className="mt-5 rounded-xl border border-border bg-muted/40 p-4" aria-labelledby={id+'-title'}>
    <h4 id={id+'-title'} className="mb-2 flex items-center gap-2 text-sm font-semibold"><Calculator size={16} aria-hidden="true"/> Simuler les commissions d’encaissement</h4>
    <p className="mb-4 text-xs leading-5 text-muted-foreground">Répartis tes paiements entre les moyens utilisés maintenant. Les projets prévus plus tard ne sont pas inclus dans le calcul.</p>
    <div className="space-y-4">{rails.map(rail => <fieldset key={rail}>
      <legend className="mb-2 text-sm font-semibold">{railLabels[rail]}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Nombre de paiements
          <input type="number" inputMode="numeric" min="1" max="100000" step="1" value={draft[rail].count}
            onChange={event => setDraft(values => ({...values, [rail]:{...values[rail], count:event.target.value}}))}
            aria-invalid={!!error} aria-describedby={error ? id+'-error' : undefined}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-3 text-base text-foreground"/>
        </label>
        <label className="text-xs text-muted-foreground">Montant moyen par paiement (FCFA)
          <input type="number" inputMode="numeric" min="1" max="100000000" step="1" value={draft[rail].amount}
            onChange={event => setDraft(values => ({...values, [rail]:{...values[rail], amount:event.target.value}}))}
            aria-invalid={!!error} aria-describedby={error ? id+'-error' : undefined}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-3 text-base text-foreground"/>
        </label>
      </div>
    </fieldset>)}</div>
    {error && <p id={id+'-error'} role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    <button type="submit" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#102e48] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1b4565] sm:w-auto">
      <Calculator size={17} aria-hidden="true"/> {simulation ? 'Recalculer les commissions' : 'Lancer la simulation'}
    </button>
    <div className="mt-3 text-xs leading-5 text-muted-foreground" role="status">
      {simulation && <p>Volume simulé : {XAF.format(simulation.channels.reduce((sum, channel) => sum + channel.count * channel.amountXaf, 0))} FCFA.</p>}
      {simulation && dirty && <p className="font-medium text-amber-800 dark:text-amber-300">Valeurs modifiées : clique sur « Recalculer les commissions » pour actualiser les résultats.</p>}
      {!simulation && <p>Renseigne tes volumes puis lance la simulation. Les frais absents de notre relevé restent inconnus, jamais zéro.</p>}
      {rails.includes('international') && <p>Pour l’international, les montants représentent un équivalent FCFA. Change, devise de règlement et frais transfrontaliers restent à confirmer.</p>}
    </div>
  </form>
}
