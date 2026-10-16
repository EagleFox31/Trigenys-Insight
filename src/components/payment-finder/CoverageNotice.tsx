import { railLabels } from './catalog'
import type { previewCoverage } from './coverage'

export function CoverageNotice({coverage,onDeferInternational,onExplore,onChangeMethods}: {
  coverage:ReturnType<typeof previewCoverage>
  onDeferInternational?:()=>void
  onExplore:()=>void
  onChangeMethods?:()=>void
}) {
  if (!coverage) return null
  const empty=coverage.count===0
  const canDefer=coverage.rails.includes('international')&&coverage.rails.length>1
  const reason=coverage.reason==='methods' ? 'ces moyens de paiement réunis chez un même prestataire' :
    coverage.reason==='stage' ? 'ces moyens de paiement avec le statut choisi' : 'ces moyens de paiement avec l’opération choisie'
  return <div role="status" aria-live="polite" className={'rounded-xl border p-4 text-sm '+(empty?'border-amber-400/60 bg-amber-50 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100':'border-border bg-muted/40')}>
    <p className="font-semibold">{empty?'Aucune piste documentée pour cette sélection':coverage.count+' piste'+(coverage.count>1?'s':'')+' documentée'+(coverage.count>1?'s':'')+' à ce stade'}</p>
    <p className="mt-1 text-xs leading-5">{empty ? 'Notre relevé ne documente pas '+reason+'. C’est une limite de nos données, pas la preuve que ton projet est impossible.' :
      (coverage.complete?'Ces dossiers réunissent les critères essentiels sélectionnés.':'Les prochaines réponses sur ton statut et l’opération peuvent encore réduire cette liste.')}</p>
    {!empty && <p className="mt-1 text-xs leading-5">{coverage.priced===null?'Tarifs de cette opération non renseignés dans ce comparateur.':'Tarifs d’encaissement renseignés pour tous les moyens sélectionnés : '+coverage.priced+'/'+coverage.count+' dossier'+(coverage.count>1?'s':'')+'.'} {coverage.rails.map(rail=>railLabels[rail]).join(' + ')}.</p>}
    {empty && <div className="mt-3 flex flex-wrap gap-2">
      {canDefer && onDeferInternational && <button type="button" onClick={onDeferInternational} className="min-h-11 rounded-lg bg-[#102e48] px-3 py-2 text-xs font-semibold text-white">Prévoir l’international plus tard</button>}
      {onChangeMethods && <button type="button" onClick={onChangeMethods} className="min-h-11 rounded-lg border border-current/25 px-3 py-2 text-xs font-semibold">Modifier les moyens de paiement</button>}
      <button type="button" onClick={onExplore} className="min-h-11 rounded-lg border border-current/25 px-3 py-2 text-xs font-semibold">Explorer les fiches à vérifier</button>
    </div>}
  </div>
}
