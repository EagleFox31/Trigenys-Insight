import { railLabels, simulateCollection, type PaymentSimulation, type Provider } from './catalog'

const XAF = new Intl.NumberFormat('fr-CM', {maximumFractionDigits:0})

export function CollectionEstimate({provider, simulation}: {provider: Provider; simulation: PaymentSimulation | null}) {
  if (!simulation) return <p className="text-xs text-muted-foreground">Lance la simulation pour estimer les commissions sur tes volumes.</p>
  const result = simulateCollection(provider, simulation)
  return <div className="rounded-xl bg-muted/70 p-3 text-sm">
    <p className="font-semibold">{result.complete ? 'Commissions d’encaissement estimées' : 'Estimation partielle'}</p>
    <dl className="mt-2 space-y-2">{result.lines.map(line => <div key={line.rail}>
      <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
        <dt className="text-xs text-muted-foreground">{railLabels[line.rail]}</dt>
        <dd className="text-xs font-semibold">{line.estimate === null ? 'Tarif à confirmer' : XAF.format(line.estimate)+' FCFA'}</dd>
      </div>
      {line.fee && <a href={line.fee.source} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-xs text-muted-foreground underline underline-offset-2">
        {line.fee.percent.toLocaleString('fr-FR')} %{line.fee.perTransactionXaf ? ' + '+XAF.format(line.fee.perTransactionXaf)+' FCFA/paiement' : ''} · source du tarif
      </a>}
    </div>)}</dl>
    {result.total !== null && <p className="mt-3 flex flex-wrap justify-between gap-2 border-t border-border pt-2 font-semibold"><span>Total collecte</span><span>{XAF.format(result.total)} FCFA</span></p>}
    {!result.complete && <p className="mt-3 text-xs text-muted-foreground">Total non calculable : un tarif manque. Les montants connus ci-dessus ne constituent pas le coût complet.</p>}
    {!!provider.fee?.annualXaf && <p className="mt-2 text-xs text-muted-foreground">{XAF.format(provider.fee.annualXaf)} FCFA/an en supplément, non inclus dans le total.</p>}
  </div>
}
