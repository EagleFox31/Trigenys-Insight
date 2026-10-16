'use client'

import { useId, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, ExternalLink, Filter, RotateCcw, Search, ShieldAlert } from 'lucide-react'
import {
  categoryLabels, currentPaymentMethods, needLabels, priorityLabels, providers, railLabels,
  simulateCollection, stackIntegration, stackLabels, stageLabels, togglePlannedMethod, useCaseLabels,
  type BusinessStage, type FinderProfile, type PaymentMethod, type PaymentRail, type PaymentSimulation, type Priority,
  type PaymentNeed, type Provider, type ProviderCategory, type TechStack, type UseCase,
} from './catalog'
import { CalculatorInputs } from './CalculatorInputs'
import { CollectionEstimate } from './CollectionEstimate'
import { ProviderLogo } from './ProviderLogo'
import { CoverageNotice } from './CoverageNotice'
import { catalogCoverage, deferInternational, previewCoverage } from './coverage'
import { assessProviders, selectDiverseShortlist, type AssessedCandidate } from './decisionEngine'

type StepKey = 'useCase' | 'rail' | 'stack' | 'stage' | 'need' | 'priority'
const steps: {key: StepKey; title: string; hint: string}[] = [
  {key:'useCase',title:'Tu construis quoi ?',hint:'On adapte les critères à la réalité de ton produit.'},
  {key:'rail',title:'Quelles transactions dois-tu encaisser ?',hint:'Coche tous les moyens à gérer maintenant, puis ceux envisagés plus tard. Tu peux en choisir plusieurs.'},
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
  stack:['python','node','php','mobile','kotlin','go','java','dotnet','other','noCode'],
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

function ProviderCard({provider,why,unknown,simulation,futureRails,stack,evidence,assessment}: {
  provider:Provider;why:string[];unknown:string[];simulation:PaymentSimulation|null;futureRails:PaymentMethod[];stack:TechStack;evidence?:{label:string;url:string}[];assessment:AssessedCandidate
}) {
  const integration = stackIntegration(provider,stack)
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <ProviderLogo provider={provider}/>
        <div className="min-w-0">
          <h4 className="text-lg font-semibold text-foreground">{provider.name}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">{categoryLabels[provider.category]}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-3 text-xs">
        <div>
          <p className="text-muted-foreground">Adéquation indicative</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{assessment.suitability===null?'—':assessment.suitability+'/100'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Couverture documentaire</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{assessment.evidenceCoverage}%</p>
        </div>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer font-medium">Détail du calcul multicritère</summary>
        <div className="mt-2 space-y-2">
          {assessment.criteria.map(c=><div key={c.key} className="flex items-start justify-between gap-3">
            <span><strong>{c.label}</strong> · poids {c.weight}<span className="block text-muted-foreground">{c.explanation}</span></span>
            <span className="shrink-0 font-semibold tabular-nums">{c.rating===null?'Inconnu':c.rating+'/100'}</span>
          </div>)}
        </div>
      </details>
      {why.length > 0 ? <div className="space-y-1.5">{why.slice(0,2).map(item=>(
        <p className="flex items-start gap-2 text-sm" key={item}><Check size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600"/>{item}</p>
      ))}</div> : <p className="text-sm text-muted-foreground">Compatibilité avec ce parcours à vérifier.</p>}
      <p className="text-xs text-muted-foreground">{integration.label}{integration.source && <> · <a href={integration.source} target="_blank" rel="noopener noreferrer" className="underline">Documentation</a></>}</p>
      {futureRails.length > 0 && <div className="rounded-lg border border-border p-3 text-xs">
        <p className="mb-1 font-semibold">Pour la suite</p>
        {futureRails.map(rail=><p key={rail}>{railLabels[rail]} : {provider.rails?.includes(rail) ? 'moyen annoncé, activation et pays à confirmer' : 'à vérifier auprès du fournisseur'}</p>)}
      </div>}
      <div className="mt-auto"><CollectionEstimate provider={provider} simulation={simulation}/></div>
      {unknown.length>0 && <details className="text-sm">
        <summary className="cursor-pointer font-medium text-amber-800 dark:text-amber-300">À confirmer ({unknown.length})</summary>
        <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">{unknown.map(u=><li key={u}>{u}</li>)}</ul>
      </details>}
      {evidence && evidence.length>0 && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer font-medium">Pourquoi cette piste ? Voir les justificatifs</summary><div className="mt-2 flex flex-wrap gap-3">{evidence.map(e=><a key={e.label+e.url} href={e.url} target="_blank" rel="noopener noreferrer" className="underline">{e.label}</a>)}</div></details>}
      {provider.source ? <a href={provider.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold underline underline-offset-4">Consulter la source <ExternalLink size={14} aria-hidden="true"/></a> : <span className="text-xs text-muted-foreground">Documentation officielle à qualifier.</span>}
    </article>
  )
}

/** Compact, expandable directory rows deliberately avoid implying that every
 * one of the 63 leads has been independently tested. */
function DirectoryRow({provider,simulation,selected,onToggle,selectionFull}:{
  provider:Provider;simulation:PaymentSimulation|null;selected:boolean;onToggle:()=>void;selectionFull:boolean
}) {
  const [expanded,setExpanded]=useState(false)
  const documented = [provider.rails?.length?'Moyens annoncés':'',provider.stacks?.length?'Intégration décrite':'',provider.sandbox?'Sandbox décrite':''].filter(Boolean)
  return (
    <article className="border-b border-border last:border-b-0">
      <div className="flex flex-wrap items-center gap-2 py-3 sm:flex-nowrap">
        <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(open=>!open)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 text-left focus-visible:outline-2 focus-visible:outline-emerald-600">
          <ProviderLogo provider={provider} compact/><span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{provider.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{categoryLabels[provider.category]}</span>
          </span>
          <span className="hidden min-w-32 text-xs text-muted-foreground md:block">
            {provider.rails?.length ? provider.rails.map(rail=>railLabels[rail]).join(' · ') : 'Moyens à confirmer'}
          </span>
          <span className="min-w-20 text-right text-xs font-semibold sm:min-w-32">
            {provider.fee?provider.fee.percent.toLocaleString('fr-FR')+' % annoncé':'Tarif non renseigné'}
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
              <div className="mt-2"><CollectionEstimate provider={provider} simulation={simulation}/></div>
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

function ComparePanel({selected,simulation,onRemove}:{
  selected:Provider[];simulation:PaymentSimulation|null;onRemove:(id:string)=>void
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
      if (!simulation) return 'Lance la simulation'
      const result=simulateCollection(p,simulation)
      return result.total===null?'Partielle : tarif à confirmer':XAF.format(result.total)+' FCFA (collecte seulement)'
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
                <span className="flex items-center gap-2"><ProviderLogo provider={p} compact/>{p.name}</span>
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
      <p className="mt-3 text-xs text-muted-foreground">L’absence d’information signifie « inconnu », jamais « incompatible ». Les estimations concernent les moyens simulés. Un tarif manquant empêche le calcul du total. Le support client n’a pas été évalué.</p>
    </section>
  )
}

export function PaymentFinder({embedded=false}:{embedded?:boolean}) {
  const id=useId()
  const [mode,setMode]=useState<'wizard'|'expert'>('wizard')
  const [step,setStep]=useState(0)
  const [answers,setAnswers]=useState<Partial<FinderProfile>>({})
  const [simulation,setSimulation]=useState<PaymentSimulation|null>(null)
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
  const activeRails:PaymentMethod[]=mode==='wizard'&&profile?currentPaymentMethods(profile):railFilter==='mobileCards'?['mobile','cards']:[railFilter==='all'?'mobile':railFilter]
  const simulationKey=activeRails.slice().sort().join('-')
  const activeSimulation=simulation?.channels.map(c=>c.rail).sort().join('-')===simulationKey?simulation:null
  const ranked=useMemo(()=>profile?assessProviders(profile,activeSimulation):[],[profile,activeSimulation])
  const shortlist=selectDiverseShortlist(ranked)
  const unranked=shortlist.length===0?ranked.filter(candidate=>candidate.tier==='documented').slice(0,3):[]
  const displayed=shortlist.length?shortlist:unranked
  const coverageAnswers=useMemo(()=>({...answers,...(step<3?{stage:undefined}:{}),...(step<4?{need:undefined}:{})}),[answers,step])
  const coverage=useMemo(()=>previewCoverage(coverageAnswers),[coverageAnswers])
  const exploratory=ranked.filter(result=>result.tier==='investigate' && (currentPaymentMethods(profile??{rail:'mobile'}).some(rail=>result.provider.rails?.includes(rail)) || result.provider.useCases?.includes(profile?.useCase??'saas'))).slice(0,3)
  const matching=useMemo(()=>providers.filter(p=>
    (category==='all'||p.category===category) &&
    (!onlyWithFees||!!p.fee) &&
    (railFilter==='all'|| !documentedOnly || (railFilter==='mobileCards'?(p.rails?.includes('mobile') && p.rails?.includes('cards')):p.rails?.includes(railFilter))) &&
    (stackFilter==='all'|| !documentedOnly || stackIntegration(p,stackFilter).kind!=='unknown') &&
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
    const next=key==='useCase'?({...answers,useCase:value as UseCase,need:answers.useCase===value?answers.need:undefined}):key==='stage'?({...answers,stage:value as BusinessStage,need:undefined}):({...answers,[key]:value})
    setAnswers(next)
    if ((key==='stage'||key==='need') && previewCoverage(next)?.count===0) return
    setStep(s=>Math.min(steps.length,s+1))
  }
  function reset() {
    setAnswers({})
    setStep(0)
    setSimulation(null)
  }
  const railChoices:PaymentMethod[]=answers.useCase==='freelance'?['international','cards','mobile']:['mobile','cards','international']
  function toggleRail(period:'currentRails'|'futureRails',rail:PaymentMethod) {
    setAnswers(a=>({...a,...togglePlannedMethod(a,period,rail)}))
    setSimulation(null)
  }
  function deferInternationalChoice() {
    setAnswers(deferInternational)
    setSimulation(null)
  }
  function exploreUnverified() {
    setMode('expert')
    setCategory('all')
    setRailFilter('all')
    setStackFilter('all')
    setDocumentedOnly(false)
    setOnlyWithFees(false)
    setSearch('')
    setVisibleCount(15)
  }
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
          <details className="mb-5 rounded-xl border border-border bg-muted/25 p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">Données du comparateur : {catalogCoverage.methods}/{catalogCoverage.total} fiches avec moyens renseignés</summary>
            <p className="mt-2 leading-5">{catalogCoverage.mobileFees}/{catalogCoverage.total} fiches avec un tarif Mobile Money et {catalogCoverage.cardFees}/{catalogCoverage.total} avec un tarif carte. Les autres fiches restent des pistes à documenter. Un tarif absent de notre relevé peut être publié ailleurs ou disponible sur devis.</p>
          </details>
          {mode==='wizard' ? (
            !finished ? (
              <div>
                <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Question {step+1} sur {steps.length}</span><span>{Math.round(step/steps.length*100)} %</span>
                </div>
                <div className="mb-7 grid grid-cols-6 gap-1.5" aria-hidden="true">
                  {steps.map((s,i)=><span key={s.key} className={'h-1.5 rounded-full '+(i<=step?'bg-emerald-600':'bg-muted')}/>)}
                </div>
                <h3 className="text-xl font-semibold sm:text-2xl">{prompt}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{steps[step].hint}</p>
                {steps[step].key==='stack' && <p className="mt-2 text-xs text-muted-foreground">Pour une application mobile, garde les clés secrètes et la validation des paiements côté serveur.</p>}
                {steps[step].key!=='rail' && step>1 && <div className="mt-4"><CoverageNotice coverage={coverage} onDeferInternational={deferInternationalChoice} onExplore={exploreUnverified} onChangeMethods={()=>setStep(1)}/></div>}
                {steps[step].key==='rail' ? <div className="mt-6 space-y-5">
                  {(['currentRails','futureRails'] as const).map(period=><div key={period}>
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold">{period==='currentRails'?'À gérer maintenant':'Prévu plus tard (facultatif)'}</legend>
                      <div className="grid gap-2 sm:grid-cols-3">{railChoices.map(rail=>{
                        const selected=answers[period]?.includes(rail)??false
                        const candidateRails=selected?answers.currentRails??[]:[...(answers.currentRails??[]),rail]
                        const optionCoverage=period==='currentRails'?previewCoverage({...coverageAnswers,currentRails:candidateRails}):null
                        return <label key={rail} className={'flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm font-medium '+(selected?'border-[#102e48] bg-[#102e48]/5':'border-border bg-background')}>
                          <input type="checkbox" aria-label={railLabels[rail]} checked={selected} onChange={()=>toggleRail(period,rail)} className="mt-0.5 size-5 shrink-0 accent-[#102e48]"/>
                          <span>{railLabels[rail]}<span className={'mt-1 block text-xs font-normal '+(optionCoverage?.count===0?'text-amber-800 dark:text-amber-300':'text-muted-foreground')}>
                            {period==='futureRails'?'Objectif d’évolution, non bloquant':optionCoverage?.count===0?'Aucune combinaison documentée':optionCoverage?.count+' piste(s) à ce stade'}
                          </span></span>
                        </label>
                      })}</div>
                    </fieldset>
                    {period==='currentRails' && <div className="mt-3"><CoverageNotice coverage={coverage} onDeferInternational={deferInternationalChoice} onExplore={exploreUnverified}/></div>}
                  </div>)}
                  <p className="text-xs leading-5 text-muted-foreground">À l’international, pays acceptés, devises et conditions d’encaissement restent à vérifier. Accepter les cartes ne garantit pas tous les paiements depuis l’étranger.</p>
                  <p className="text-xs text-muted-foreground">Les résultats doivent couvrir tous tes besoins actuels. Les besoins futurs servent à préparer l’évolution sans écarter les solutions adaptées au démarrage.</p>
                  <button type="button" disabled={!answers.currentRails?.length||coverage?.count===0} onClick={()=>{setAnswers(a=>({...a,rail:a.currentRails![0]}));setStep(s=>s+1)}} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#102e48] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">Continuer <ArrowRight size={16} aria-hidden="true"/></button>
                </div> : <div className="mt-6 grid gap-2 sm:grid-cols-2" aria-label={prompt}>
                  {(steps[step].key==='need'?needChoices:choices[steps[step].key]).map(value=>(
                    <button type="button" key={value} onClick={()=>select(steps[step].key,value)} aria-pressed={answers[steps[step].key]===value} aria-label={labels[steps[step].key][value as never]} aria-describedby={(steps[step].key==='stage'||steps[step].key==='need')?id+'-'+steps[step].key+'-'+value+'-coverage':undefined}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-background p-4 text-left text-sm font-medium transition hover:border-[#102e48] hover:bg-[#102e48]/5 focus-visible:outline-2 focus-visible:outline-offset-2">
                      <span>{labels[steps[step].key][value as never]}{(steps[step].key==='stage'||steps[step].key==='need') && <span id={id+'-'+steps[step].key+'-'+value+'-coverage'} className="mt-1 block text-xs font-normal text-muted-foreground">{previewCoverage({...coverageAnswers,[steps[step].key]:value})?.count??0} piste(s) documentée(s) à ce stade</span>}</span> <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted-foreground"/>
                    </button>
                  ))}
                </div>}
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
              <div>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Ton profil</p>
                    <h3 className="mt-1 text-xl font-semibold">{displayed.length ? displayed.length+' piste'+(displayed.length>1?'s':'')+' documentée'+(displayed.length>1?'s':'')+' à examiner' : 'Sélection à documenter davantage'}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {useCaseLabels[profile!.useCase]} · Maintenant : {currentPaymentMethods(profile!).map(rail=>railLabels[rail]).join(' + ')} · {stackLabels[profile!.stack]} · {stageLabels[profile!.stage]} · {needLabels[profile!.need??'collect']}.
                    </p>
                  </div>
                  {profile!.futureRails?.length ? <p className="text-sm text-muted-foreground">Plus tard : {profile!.futureRails.map(rail=>railLabels[rail]).join(' + ')}.</p> : null}
                  <button type="button" onClick={()=>setStep(0)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <RotateCcw size={16} aria-hidden="true"/> Modifier mes réponses
                  </button>
                </div>
                <div className="rounded-xl border border-border bg-muted/25 p-3 text-xs leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">Méthode V2 :</strong> adéquation normalisée sur les critères disposant de données, avec réduction si la documentation manque. L’indicateur de couverture mesure seulement la quantité d’informations disponibles, pas la fiabilité ni l’agrément du prestataire. La diversification départage des solutions proches sans forcer l’entrée de fournisseurs non qualifiés.
                  {profile!.priority==='support' && <p className="mt-2 font-medium text-amber-800 dark:text-amber-200">Aucun benchmark SAV indépendant : les critères techniques et opérationnels servent uniquement à préparer la présélection, sans noter la qualité du support.</p>}
                  {profile!.priority==='cost' && (!activeSimulation || profile!.need!=='collect') && <p className="mt-2">Les frais de collecte ne peuvent pas être classés pour ce parcours tant qu’un volume comparable et une opération d’encaissement ne sont pas renseignés.</p>}
                  {profile!.priority==='cost' && activeSimulation && profile!.need==='collect' && <p className="mt-2">Le coût dépend du volume saisi, uniquement pour les commissions publiées et comparables, hors frais annuels, retraits et taxes.</p>}
                </div>
                <CalculatorInputs key={simulationKey} rails={activeRails} simulation={activeSimulation} onSimulate={setSimulation}/>
                {unranked.length>0 && <p className="mt-4 rounded-xl border border-amber-400/60 p-3 text-sm">Ces fiches réunissent les critères essentiels, mais les données manquent pour établir un classement multicritère. Consulte les justificatifs et les points à confirmer.</p>}
                {displayed.length>0 ? (
                  <div className="mt-6 grid gap-3 lg:grid-cols-3">
                    {displayed.map(c=><ProviderCard key={c.provider.id} provider={c.provider} why={c.known} unknown={c.unknown} evidence={c.evidence} assessment={c} simulation={activeSimulation} futureRails={profile!.futureRails??[]} stack={profile!.stack}/>)}
                  </div>
                ) : (
                  <div className="mt-5"><CoverageNotice coverage={coverage} onDeferInternational={()=>{deferInternationalChoice();setStep(1)}} onExplore={exploreUnverified} onChangeMethods={()=>setStep(1)}/></div>
                )}
                {displayed.length>0 && <p className="mt-4 text-sm text-muted-foreground">
                  Les pistes ci-dessus remplissent les critères essentiels d’après les documents consultés, mais leur ouverture en production, leur KYC et leur fiabilité restent à confirmer. Une donnée absente n’est jamais une preuve d’incompatibilité.
                </p>}
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
              {compared.length>0 && <ComparePanel selected={compared} simulation={activeSimulation} onRemove={toggleCompare}/>}
              <CalculatorInputs key={simulationKey} rails={activeRails} simulation={activeSimulation} onSimulate={setSimulation}/>
              <div className="mt-5 overflow-hidden rounded-xl border border-border">
                {matching.slice(0,visibleCount).map(provider=>(
                  <DirectoryRow key={provider.id} provider={provider} simulation={activeSimulation}
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
