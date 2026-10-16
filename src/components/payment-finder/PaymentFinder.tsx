'use client'

import { useId, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Calculator, Check, ChevronDown, ChevronRight, ExternalLink, Filter, RotateCcw, Search, ShieldAlert } from 'lucide-react'
import {
  categoryLabels, collectionFeeEstimate, needLabels, priorityLabels, providers, railLabels,
  rankProviders, stackLabels, stageLabels, useCaseLabels,
  type BusinessStage, type FinderProfile, type PaymentRail, type Priority,
  type PaymentNeed, type Provider, type ProviderCategory, type TechStack, type UseCase,
} from './catalog'

type StepKey = keyof FinderProfile
const steps: {key: StepKey; title: string; hint: string}[] = [
  {key:'useCase',title:'Tu construis quoi ?',hint:'On adapte les critères à la réalité de ton produit.'},
  {key:'rail',title:'Quelles transactions dois-tu encaisser ?',hint:'Sélectionne ton besoin principal. Les autres seront affinés en mode expert.'},
  {key:'stack',title:'Tu développes avec quoi ?',hint:'Une bonne API REST peut aussi convenir sans SDK officiel.'},
  {key:'stage',title:'Où en est ton activité ?',hint:'Le statut juridique détermine les documents à présenter, pas seulement les tarifs.'},
  {key:'need',title:'Quelle opération est indispensable ?',hint:'Une API qui encaisse ne sait pas nécessairement faire des décaissements, du split ou des renouvellements.'},
  {key:'priority',title:'Qu’est-ce qui compte le plus ?',hint:'Le SAV et le KYC ne sont jamais notés sans mesures indépendantes.'},
]

const choices: {
  useCase: UseCase[]; rail: PaymentRail[]; stack: TechStack[];
  stage: BusinessStage[]; need: PaymentNeed[]; priority: Priority[]
} = {
  useCase:['saas','commerce','marketplace','freelance','agency'],
  rail:['mobile','mobileCards','cards','international'],
  stack:['python','node','php','mobile','other'],
  stage:['mvp','individual','company'],
  need:['collect','payout','bulk','multiService','subscription','split'],
  priority:['cost','integration','support','coverage'],
}

const labels = {useCase:useCaseLabels,rail:railLabels,stack:stackLabels,stage:stageLabels,need:needLabels,priority:priorityLabels}
const needsByCase: Record<UseCase,PaymentNeed[]> = {
  saas:['collect','subscription','payout'],
  commerce:['collect','payout'],
  marketplace:['collect','split','payout','bulk'],
  freelance:['collect','payout'],
  agency:['collect','multiService','bulk','payout'],
}
const XAF = new Intl.NumberFormat('fr-CM',{maximumFractionDigits:0})
const categoryOptions: {value:'all'|ProviderCategory;label:string}[] = [
  {value:'all',label:'Toutes les catégories'},
  ...Object.entries(categoryLabels).map(([value,label])=>({value:value as ProviderCategory,label})),
]

function ProviderCard({provider,why,unknown,count,amount,selectedRail,evidence}: {
  provider:Provider;why:string[];unknown:string[];count:number;amount:number;selectedRail?:PaymentRail; evidence?:{label:string;url:string}[]
}) {
  const isMobileEstimate = !selectedRail || selectedRail === 'mobile'
  const estimate = isMobileEstimate ? collectionFeeEstimate(provider,count,amount) : null
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-lg font-semibold text-foreground">{provider.name}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">{categoryLabels[provider.category]}</p>
        </div>

      </div>
      {why.length > 0 ? (
        <div className="space-y-1.5">
          {why.slice(0,3).map(item=>(
            <p className="flex items-start gap-2 text-sm" key={item}>
              <Check size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" />
              {item}
            </p>
          ))}
        </div>
      ) : <p className="text-sm text-muted-foreground">Aucune compatibilité particulière documentée pour ce parcours.</p>}
      {estimate!==null ? (
        <div className="mt-auto rounded-xl bg-muted/70 p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground">Commissions d’encaissement Mobile Money estimées</span>
            <strong className="shrink-0">{XAF.format(estimate)} FCFA</strong>
          </div>
          {provider.fee && <p className="mt-1 text-xs text-muted-foreground">
            {provider.fee.percent}%{provider.fee.perTransactionXaf?(' + '+XAF.format(provider.fee.perTransactionXaf)+' FCFA/transaction'):''}
            {provider.fee.annualXaf?' · '+XAF.format(provider.fee.annualXaf)+' FCFA/an en sus':''}
          </p>}
        </div>
      ) : (
        <p className="mt-auto text-xs text-muted-foreground">
          {isMobileEstimate?'Tarif Mobile Money non documenté dans ce relevé.':'Frais du moyen sélectionné non documentés.'}
        </p>
      )}
      {unknown.length>0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-amber-800 dark:text-amber-300">
            À confirmer ({unknown.length})
          </summary>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
            {unknown.map(u=><li key={u}>{u}</li>)}
            <li>Éligibilité et conditions de production actuelles</li>
          </ul>
        </details>
      )}
      {evidence && evidence.length>0 && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer font-medium">Pourquoi cette piste ? Voir les justificatifs</summary><div className="mt-2 flex flex-wrap gap-3">{evidence.map(e=><a key={e.label+e.url} href={e.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline dark:text-emerald-300">{e.label}</a>)}</div></details>}
      {provider.fee && <a href={provider.fee.source} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 underline underline-offset-4 dark:text-emerald-300">Source du tarif Mobile Money</a>}
      {provider.source ? (
        <a href={provider.source} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300">
          Consulter la source <ExternalLink size={14} aria-hidden="true" />
        </a>
      ) : <span className="text-xs text-muted-foreground">Documentation officielle non validée dans cet inventaire.</span>}
    </article>
  )
}


/** Compact, expandable directory rows deliberately avoid implying that every
 * one of the 63 leads has been independently tested. */
function DirectoryRow({provider,count,amount,selected,onToggle,selectionFull}:{
  provider:Provider;count:number;amount:number;selected:boolean;onToggle:()=>void;selectionFull:boolean
}) {
  const [expanded,setExpanded]=useState(false)
  const estimate=collectionFeeEstimate(provider,count,amount)
  const documented = [provider.rails?.length?'Moyens annoncés':'',provider.stacks?.length?'Intégration décrite':'',provider.sandbox?'Sandbox décrite':''].filter(Boolean)
  return (
    <article className="border-b border-border last:border-b-0">
      <div className="flex flex-wrap items-center gap-2 py-3 sm:flex-nowrap">
        <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(open=>!open)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 text-left focus-visible:outline-2 focus-visible:outline-emerald-600">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{provider.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{categoryLabels[provider.category]}</span>
          </span>
          <span className="hidden min-w-32 text-xs text-muted-foreground md:block">
            {provider.rails?.length ? provider.rails.map(rail=>railLabels[rail]).join(' · ') : 'Moyens à confirmer'}
          </span>
          <span className="min-w-20 text-right text-xs font-semibold sm:min-w-32">
            {provider.fee?provider.fee.percent.toLocaleString('fr-FR')+' % annoncé':'Tarif à confirmer'}
          </span>
          <ChevronDown aria-hidden="true" size={18} className={'shrink-0 text-muted-foreground transition-transform '+(expanded?'rotate-180':'')} />
        </button>
        <button type="button" aria-pressed={selected} disabled={selectionFull&&!selected} onClick={onToggle}
          className={'shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 '+(selected?'border-emerald-700 bg-emerald-700 text-white':'border-border hover:border-emerald-600')}>
          {selected?'Retirer':'Comparer'}
        </button>
      </div>
      {expanded && (
        <div className="mb-4 rounded-xl bg-muted/45 px-4 py-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Données disponibles</p>
              {documented.length ? <ul className="mt-2 list-inside list-disc space-y-1">
                {documented.map(item=><li key={item}>{item}</li>)}
              </ul> : <p className="mt-2 text-muted-foreground">Pas encore de compatibilité qualifiée dans ce relevé.</p>}
              {provider.stacks?.length ? <p className="mt-2 text-xs text-muted-foreground">Stacks : {provider.stacks.map(stack=>stackLabels[stack]).join(', ')}</p> : null}
              {provider.individualPath && <p className="mt-2 text-xs">Parcours KYC individuel annoncé, sous réserve de validation.</p>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coût et conditions</p>
              <p className="mt-2">
                {estimate===null?'Frais non documentés dans ce relevé.':('Estimation Mobile Money : '+XAF.format(estimate)+' FCFA')}
              </p>
              {provider.fee?.perTransactionXaf ? <p className="mt-1 text-xs text-muted-foreground">{provider.fee.perTransactionXaf} FCFA fixes par transaction en plus du pourcentage.</p> : null}
              {provider.fee?.annualXaf ? <p className="mt-1 text-xs text-muted-foreground">{XAF.format(provider.fee.annualXaf)} FCFA de frais annuels supplémentaires annoncés.</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">KYC, disponibilité en production, délai de règlement et SAV non audités.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-3 text-xs">
            {provider.source ? <a href={provider.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-700 underline dark:text-emerald-300">Documentation ou site <ExternalLink size={12} aria-hidden="true"/></a>:<span className="text-muted-foreground">Source officielle à qualifier.</span>}
            {provider.fee && <a href={provider.fee.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-700 underline dark:text-emerald-300">Source du tarif <ExternalLink size={12} aria-hidden="true"/></a>}
          </div>
        </div>
      )}
    </article>
  )
}

function ComparePanel({selected,count,amount,onRemove}:{
  selected:Provider[];count:number;amount:number;onRemove:(id:string)=>void
}) {
  if(selected.length===0) return null
  const rows:{label:string;value:(p:Provider)=>string}[]=[
    {label:'Catégorie',value:p=>categoryLabels[p.category]},
    {label:'Mobile Money',value:p=>p.rails?.includes('mobile')?'Annoncé':'À confirmer'},
    {label:'Cartes',value:p=>p.rails?.includes('cards')?'Annoncé':'À confirmer'},
    {label:'Paiements internationaux',value:p=>p.rails?.includes('international')?'Annoncé':'À confirmer'},
    {label:'SDK / API',value:p=>p.stacks?.length?p.stacks.map(s=>stackLabels[s]).join(', '):'À confirmer'},
    {label:'Sandbox',value:p=>p.sandbox?'Documentée':'À confirmer'},
    {label:'KYC individuel',value:p=>p.individualPath?'Parcours annoncé':'À confirmer'},
    {label:'Commission MM',value:p=>p.fee?(p.fee.percent+' %'+(p.fee.perTransactionXaf?' + '+p.fee.perTransactionXaf+' FCFA':'')):'À confirmer'},
    {label:'Estimation sur le volume',value:p=>{
      const fee=collectionFeeEstimate(p,count,amount)
      return fee===null?'Non disponible':XAF.format(fee)+' FCFA (collecte seulement)'
    }},
  ]
  return (
    <section className="mt-5 rounded-2xl border border-emerald-700/30 bg-emerald-500/5 p-4 sm:p-5" aria-label="Comparaison des fournisseurs sélectionnés">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">Comparer {selected.length} fournisseur{selected.length>1?'s':''}</h4>
        <p className="text-xs text-muted-foreground">Maximum 3 · Données déclarées, non auditées</p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-xs sm:text-sm">
          <thead><tr>
            <th className="w-[160px] border-b border-border p-2 text-muted-foreground">Critère</th>
            {selected.map(p=><th key={p.id} className="min-w-[150px] border-b border-border p-2 align-top">
              <div className="flex items-start justify-between gap-2">
                <span>{p.name}</span>
                <button type="button" aria-label={'Retirer '+p.name+' de la comparaison'} onClick={()=>onRemove(p.id)} className="text-xs font-normal text-emerald-700 underline dark:text-emerald-300">Retirer</button>
              </div>
            </th>)}
          </tr></thead>
          <tbody>{rows.map(row=><tr key={row.label}>
            <th scope="row" className="border-b border-border/60 p-2 align-top font-medium">{row.label}</th>
            {selected.map(p=><td key={p.id} className="border-b border-border/60 p-2 align-top">{row.value(p)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">L’absence d’information signifie « inconnu », jamais « incompatible ». Les commissions sont partielles et concernent uniquement le Mobile Money. Le support client n’a pas été évalué.</p>
    </section>
  )
}

export function PaymentFinder({embedded=false}:{embedded?:boolean}) {
  const id=useId()
  const [mode,setMode]=useState<'wizard'|'expert'>('wizard')
  const [step,setStep]=useState(0)
  const [answers,setAnswers]=useState<Partial<FinderProfile>>({})
  const [count,setCount]=useState(100)
  const [amount,setAmount]=useState(10000)
  const [search,setSearch]=useState('')
  const [category,setCategory]=useState<'all'|ProviderCategory>('all')
  const [onlyWithFees,setOnlyWithFees]=useState(false)
  const [railFilter,setRailFilter]=useState<'all'|PaymentRail>('all')
  const [stackFilter,setStackFilter]=useState<'all'|TechStack>('all')
  const [documentedOnly,setDocumentedOnly]=useState(false)
  const [sort,setSort]=useState<'evidence'|'alpha'|'fees'>('evidence')
  const [visibleCount,setVisibleCount]=useState(15)
  const [comparedIds,setComparedIds]=useState<string[]>([])

  const finished=step===steps.length
  const profile = finished ? answers as FinderProfile : null
  const ranked=useMemo(()=>profile?rankProviders(profile):[],[profile])
  const shortlist=ranked.filter(result=>result.tier==='documented').slice(0,3)
  const exploratory=ranked.filter(result=>result.tier==='investigate' && (result.provider.rails?.includes(profile?.rail==='mobileCards'?'mobile':profile?.rail??'mobile') || result.provider.useCases?.includes(profile?.useCase??'saas'))).slice(0,3)
  const matching=useMemo(()=>providers.filter(p=>
    (category==='all'||p.category===category) &&
    (!onlyWithFees||!!p.fee) &&
    (railFilter==='all'|| !documentedOnly || (railFilter==='mobileCards'?(p.rails?.includes('mobile') && p.rails?.includes('cards')):p.rails?.includes(railFilter))) &&
    (stackFilter==='all'|| !documentedOnly || p.stacks?.includes(stackFilter)) &&
    p.name.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr'))
  ).sort((a,b)=>{
    if(sort==='alpha') return a.name.localeCompare(b.name,'fr')
    if(sort==='fees') return (a.fee?.percent??Infinity)-(b.fee?.percent??Infinity) || a.name.localeCompare(b.name,'fr')
    const evidence=(p:Provider)=>Number(!!p.rails?.length)+Number(!!p.stacks?.length)+Number(!!p.sandbox)+Number(!!p.fee)+Number(!!p.individualPath)
    return evidence(b)-evidence(a) || a.name.localeCompare(b.name,'fr')
  }),[search,category,onlyWithFees,railFilter,stackFilter,documentedOnly,sort])
  const compared=comparedIds.map(id=>providers.find(p=>p.id===id)).filter((p):p is Provider=>Boolean(p))
  const toggleCompare=(id:string)=>setComparedIds(curr=>curr.includes(id)?curr.filter(x=>x!==id):curr.length<3?[...curr,id]:curr)


  function select(key:StepKey,value:string) {
    setAnswers(a=>key==='useCase'?({...a,useCase:value as UseCase,need:undefined}):({...a,[key]:value}))
    setStep(s=>Math.min(steps.length,s+1))
  }
  function reset() {
    setAnswers({})
    setStep(0)
    setCount(100)
    setAmount(10000)
  }
  const railChoices:PaymentRail[]=answers.useCase==='freelance'?['international','cards','mobile','mobileCards']:choices.rail
  const needChoices: PaymentNeed[] = needsByCase[answers.useCase??'saas']
  const prompt=steps[step]?.key==='rail' && answers.useCase==='freelance' ? 'Comment tes clients te paient-ils ?' : steps[step]?.key==='rail' && answers.useCase==='marketplace' ? 'Comment tes acheteurs doivent-ils payer ?' : steps[step]?.key==='need' && answers.useCase==='agency' ? 'Que dois-tu gérer pour tes clients ?' : steps[step]?.title
  const wrapper = embedded
    ? 'not-prose relative left-1/2 my-12 w-[min(1120px,calc(100vw-2rem))] -translate-x-1/2'
    : 'mx-auto w-full max-w-6xl'

  return (
    <section aria-labelledby={id+'-title'} className={wrapper}>
      <div className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-[0_18px_55px_-35px_rgba(15,23,42,.3)]">
        <div className="bg-gradient-to-r from-emerald-950 to-teal-900 p-5 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-200">Trigenys Insight · Payment Finder</p>
          <h2 id={id+'-title'} className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
            Choisis tes paiements selon ton projet, pas selon la publicité.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85">
            63 pistes recensées. 6 questions pour orienter la recherche. Aucune disponibilité, conformité ou qualité de SAV n’est présumée.
          </p>
          <div className="mt-5 inline-flex flex-wrap gap-2" role="group" aria-label="Mode de comparaison">
            <button type="button" onClick={()=>setMode('wizard')} aria-pressed={mode==='wizard'}
              className={'rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 '+(mode==='wizard'?'bg-white text-emerald-950':'border border-white/30 text-white hover:bg-white/10')}>
              Parcours guidé
            </button>
            <button type="button" onClick={()=>setMode('expert')} aria-pressed={mode==='expert'}
              className={'rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 '+(mode==='expert'?'bg-white text-emerald-950':'border border-white/30 text-white hover:bg-white/10')}>
              <Filter size={15} aria-hidden="true" className="mr-1 inline" /> Explorer les 63
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-7">
          {mode==='wizard' ? (
            !finished ? (
              <div>
                <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Question {step+1} sur {steps.length}</span><span>{Math.round(step/steps.length*100)} %</span>
                </div>
                <div className="mb-7 grid grid-cols-5 gap-1.5" aria-hidden="true">
                  {steps.map((s,i)=><span key={s.key} className={'h-1.5 rounded-full '+(i<=step?'bg-emerald-600':'bg-muted')}/>)}
                </div>
                <h3 className="text-xl font-semibold sm:text-2xl">{prompt}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{steps[step].hint}</p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2" aria-label={prompt}>
                  {(steps[step].key==='rail'?railChoices:steps[step].key==='need'?needChoices:choices[steps[step].key]).map(value=>(
                    <button type="button" key={value} onClick={()=>select(steps[step].key,value)}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-background p-4 text-left text-sm font-medium transition hover:border-emerald-600 hover:bg-emerald-500/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
                      {labels[steps[step].key][value as never]} <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted-foreground"/>
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <button type="button" disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">
                    <ArrowLeft size={16} aria-hidden="true"/> Retour
                  </button>
                  <button type="button" onClick={reset} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                    <RotateCcw size={15} aria-hidden="true"/> Recommencer
                  </button>
                </div>
              </div>
            ) : (
              <div aria-live="polite">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Ton profil</p>
                    <h3 className="mt-1 text-xl font-semibold">{shortlist.length ? shortlist.length+' piste'+(shortlist.length>1?'s':'')+' documentée'+(shortlist.length>1?'s':'')+' à examiner' : 'Aucune piste suffisamment documentée'}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {useCaseLabels[profile!.useCase]} · {railLabels[profile!.rail]} · {stackLabels[profile!.stack]} · {stageLabels[profile!.stage]} · {needLabels[profile!.need??'collect']}.
                    </p>
                  </div>
                  <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <RotateCcw size={16} aria-hidden="true"/> Modifier mes réponses
                  </button>
                </div>
                <CalculatorInputs count={count} amount={amount} setCount={setCount} setAmount={setAmount}/>
                {shortlist.length>0 ? (
                  <div className="mt-6 grid gap-3 lg:grid-cols-3">
                    {shortlist.map(c=><ProviderCard key={c.provider.id} provider={c.provider} why={c.known} unknown={c.unknown} evidence={c.evidence} count={count} amount={amount} selectedRail={profile!.rail}/>)}
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl border border-amber-500/40 p-4 text-sm">Aucune solution ne dispose, dans notre relevé, de preuves suffisantes pour réunir ce moyen de paiement, cette opération et ce statut. Ce n’est pas une preuve d’incompatibilité : les fournisseurs doivent être interrogés. Nous ne remplaçons pas les réponses manquantes par les mêmes trois noms.</p>
                )}
                <p className="mt-4 text-sm text-muted-foreground">
                  Les pistes ci-dessus remplissent les critères essentiels d’après les documents consultés, mais leur ouverture en production, leur KYC et leur fiabilité restent à confirmer. Une donnée absente n’est jamais une preuve d’incompatibilité.
                </p>
                {exploratory.length>0 && <details className="mt-4 rounded-xl border border-border p-4 text-sm">
                  <summary className="cursor-pointer font-semibold">Autres fournisseurs à interroger (données incomplètes)</summary>
                  <div className="mt-3 space-y-3">{exploratory.map(c=><div key={c.provider.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0"><span><strong>{c.provider.name}</strong><span className="ml-2 text-xs text-muted-foreground">{c.unknown.slice(0,2).join(' · ')}</span></span>{c.provider.source&&<a href={c.provider.source} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline dark:text-emerald-300">Source</a>}</div>)}</div>
                  <p className="mt-3 text-xs text-muted-foreground">Ces acteurs ne sont pas des recommandations validées pour ton profil.</p>
                </details>}
                <button type="button" onClick={()=>setMode('expert')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
                  Voir les 63 acteurs <ArrowRight size={16} aria-hidden="true"/>
                </button>
              </div>
            )
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="text-xl font-semibold">Explorer les 63 pistes</h3><p className="mt-1 text-sm text-muted-foreground">Un annuaire filtrable, pas une liste de 63 prestataires certifiés.</p></div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{matching.length} / {providers.length}</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                  <Search size={17} aria-hidden="true" className="text-muted-foreground"/>
                  <span className="sr-only">Rechercher une plateforme</span>
                  <input type="search" value={search} onChange={e=>(setVisibleCount(15), setSearch(e.target.value))} placeholder="Chercher un fournisseur…" className="w-full bg-transparent py-1 text-sm outline-none"/>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                  <span className="sr-only">Catégorie</span>
                  <select value={category} onChange={e=>(setVisibleCount(15), setCategory(e.target.value as 'all'|ProviderCategory))} className="w-full bg-transparent py-1 text-sm outline-none">
                    {categoryOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted-foreground">Moyen recherché
                  <select value={railFilter} onChange={e=>(setVisibleCount(15), setRailFilter(e.target.value as 'all'|PaymentRail))} className="mt-1 block w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground">
                    <option value="all">Tous les moyens</option>
                    {Object.entries(railLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
                <label className="text-xs text-muted-foreground">Stack technique
                  <select value={stackFilter} onChange={e=>(setVisibleCount(15), setStackFilter(e.target.value as 'all'|TechStack))} className="mt-1 block w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground">
                    <option value="all">Toutes les stacks</option>
                    {Object.entries(stackLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={documentedOnly} onChange={e=>(setVisibleCount(15), setDocumentedOnly(e.target.checked))} className="accent-emerald-700"/>
                Restreindre aux compatibilités documentées (les inconnues ne sont pas incompatibles)
              </label>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={onlyWithFees} onChange={e=>(setVisibleCount(15), setOnlyWithFees(e.target.checked))} className="accent-emerald-700"/>
                Tarifs publics renseignés uniquement
              </label>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{matching.length} entrée{matching.length>1?'s':''} · {matching.filter(p=>p.fee).length} tarif{matching.filter(p=>p.fee).length>1?'s':''} renseigné{matching.filter(p=>p.fee).length>1?'s':''}</span>
                <label className="flex items-center gap-2">Trier par
                  <select value={sort} onChange={e=>setSort(e.target.value as 'evidence'|'alpha'|'fees')}
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground">
                    <option value="evidence">Informations disponibles</option>
                    <option value="alpha">Nom A–Z</option>
                    <option value="fees">Commission annoncée croissante</option>
                  </select>
                </label>
              </div>
              {compared.length>0 && <ComparePanel selected={compared} count={count} amount={amount} onRemove={toggleCompare}/>}
              <CalculatorInputs count={count} amount={amount} setCount={setCount} setAmount={setAmount}/>
              <div className="mt-5 overflow-hidden rounded-xl border border-border">
                {matching.slice(0,visibleCount).map(provider=>(
                  <DirectoryRow key={provider.id} provider={provider} count={count} amount={amount}
                    selected={comparedIds.includes(provider.id)} onToggle={()=>toggleCompare(provider.id)}
                    selectionFull={comparedIds.length>=3}/>
                ))}
              </div>
              {matching.length>visibleCount && (
                <button type="button" onClick={()=>setVisibleCount(n=>n+15)}
                  className="mt-4 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:border-emerald-700 hover:text-emerald-700">
                  Afficher 15 entrées supplémentaires ({matching.length-visibleCount} restantes)
                </button>
              )}
              {matching.length===0 && <p className="mt-6 text-sm text-muted-foreground">Aucun résultat. Essaie de retirer un filtre : une donnée inconnue ne signifie pas une incompatibilité.</p>}
            </div>
          )}
        </div>
        <footer className="border-t border-border bg-muted/30 p-4 text-xs leading-5 text-muted-foreground sm:px-7">
          <ShieldAlert size={16} aria-hidden="true" className="mr-2 inline"/>
          Estimations = commissions publiques d’encaissement uniquement, hors taxes éventuelles, sorties, conversion et frais annuels indiqués séparément.
          Les données datent du dossier éditorial d’octobre 2026 et sont susceptibles d’évoluer. Aucun paiement ni appel API n’est effectué par cet outil.
        </footer>
      </div>
    </section>
  )
}

function CalculatorInputs({count,amount,setCount,setAmount}:{
  count:number;amount:number;setCount:(value:number)=>void;setAmount:(value:number)=>void
}) {
  return (
    <fieldset className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
      <legend className="sr-only">Hypothèses de calcul des commissions</legend>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Calculator size={16} aria-hidden="true"/> Simuler les commissions d’encaissement</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Nombre de paiements
          <input type="number" min="1" max="100000" step="1" value={count} onChange={e=>setCount(Math.min(100000,Math.max(1,Math.floor(Number(e.target.value)||1))))}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"/>
        </label>
        <label className="text-xs text-muted-foreground">
          Montant par paiement (FCFA)
          <input type="number" min="100" max="100000000" step="100" value={amount} onChange={e=>setAmount(Math.min(100000000,Math.max(100,Math.floor(Number(e.target.value)||100))))}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"/>
        </label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Volume simulé : {XAF.format(count*amount)} FCFA. Les frais non publiés restent inconnus, jamais zéro.</p>
    </fieldset>
  )
}
