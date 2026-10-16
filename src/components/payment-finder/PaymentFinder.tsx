'use client'

import { useId, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Calculator, Check, ChevronRight, ExternalLink, Filter, RotateCcw, Search, ShieldAlert } from 'lucide-react'
import {
  categoryLabels, collectionFeeEstimate, priorityLabels, providers, railLabels,
  rankProviders, stackLabels, stageLabels, useCaseLabels,
  type BusinessStage, type FinderProfile, type PaymentRail, type Priority,
  type Provider, type ProviderCategory, type TechStack, type UseCase,
} from './catalog'

type StepKey = keyof FinderProfile
const steps: {key: StepKey; title: string; hint: string}[] = [
  {key:'useCase',title:'Tu construis quoi ?',hint:'On adapte les critères à la réalité de ton produit.'},
  {key:'rail',title:'Quelles transactions dois-tu encaisser ?',hint:'Sélectionne ton besoin principal. Les autres seront affinés en mode expert.'},
  {key:'stack',title:'Tu développes avec quoi ?',hint:'Une bonne API REST peut aussi convenir sans SDK officiel.'},
  {key:'stage',title:'Où en est ton activité ?',hint:'Avoir des clés sandbox ne garantit pas le droit d’encaisser en production.'},
  {key:'priority',title:'Qu’est-ce qui compte le plus ?',hint:'Le SAV et le KYC ne sont jamais notés sans mesures indépendantes.'},
]

const choices: {
  useCase: UseCase[]; rail: PaymentRail[]; stack: TechStack[];
  stage: BusinessStage[]; priority: Priority[]
} = {
  useCase:['saas','commerce','marketplace','freelance','agency'],
  rail:['mobile','mobileCards','cards','international'],
  stack:['python','node','php','mobile','other'],
  stage:['mvp','individual','company'],
  priority:['cost','integration','support','coverage'],
}

const labels = {useCase:useCaseLabels,rail:railLabels,stack:stackLabels,stage:stageLabels,priority:priorityLabels}
const XAF = new Intl.NumberFormat('fr-CM',{maximumFractionDigits:0})
const categoryOptions: {value:'all'|ProviderCategory;label:string}[] = [
  {value:'all',label:'Toutes les catégories'},
  ...Object.entries(categoryLabels).map(([value,label])=>({value:value as ProviderCategory,label})),
]

function ProviderCard({provider,why,unknown,count,amount,selectedRail}: {
  provider:Provider;why:string[];unknown:string[];count:number;amount:number;selectedRail?:PaymentRail
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
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-900 dark:text-amber-200">
          Offre à vérifier
        </span>
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
      ) : <p className="text-sm text-muted-foreground">Aucune compatibilité spécifique vérifiée pour ce profil.</p>}
      <div className="mt-auto rounded-xl bg-muted/70 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground">Commission Mobile Money estimée</span>
          <strong>{!isMobileEstimate?'Non comparable pour le moyen choisi':estimate===null?'Non publiée / non vérifiée':XAF.format(estimate)+' FCFA'}</strong>
        </div>
        {provider.fee && isMobileEstimate && (
          <p className="mt-1 text-xs text-muted-foreground">
            {provider.fee.percent}%{provider.fee.perTransactionXaf?(' + '+XAF.format(provider.fee.perTransactionXaf)+' FCFA/transaction'):''}
            {provider.fee.annualXaf?' · '+XAF.format(provider.fee.annualXaf)+' FCFA/an en sus':''}
          </p>
        )}
      </div>
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

  const finished=step===steps.length
  const profile = finished ? answers as FinderProfile : null
  const ranked=useMemo(()=>profile?rankProviders(profile):[],[profile])
  const shortlist=ranked.filter(result=>result.score>0).slice(0,3)
  const matching=useMemo(()=>providers.filter(p=>
    (category==='all'||p.category===category) &&
    (!onlyWithFees||!!p.fee) &&
    p.name.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr'))
  ),[search,category,onlyWithFees])

  function select(key:StepKey,value:string) {
    setAnswers(a=>({...a,[key]:value}))
    setStep(s=>Math.min(steps.length,s+1))
  }
  function reset() {
    setAnswers({})
    setStep(0)
    setCount(100)
    setAmount(10000)
  }
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
            63 pistes recensées. 5 questions pour orienter la recherche. Aucune disponibilité, conformité ou qualité de SAV n’est présumée.
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
                <h3 className="text-xl font-semibold sm:text-2xl">{steps[step].title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{steps[step].hint}</p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2" aria-label={steps[step].title}>
                  {choices[steps[step].key].map(value=>(
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
                    <h3 className="mt-1 text-xl font-semibold">3 pistes à vérifier en priorité</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {useCaseLabels[profile!.useCase]} · {railLabels[profile!.rail]} · {stackLabels[profile!.stack]} · {stageLabels[profile!.stage]}.
                    </p>
                  </div>
                  <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <RotateCcw size={16} aria-hidden="true"/> Modifier mes réponses
                  </button>
                </div>
                <CalculatorInputs count={count} amount={amount} setCount={setCount} setAmount={setAmount}/>
                {shortlist.length>0 ? (
                  <div className="mt-6 grid gap-3 lg:grid-cols-3">
                    {shortlist.map(c=><ProviderCard key={c.provider.id} provider={c.provider} why={c.known} unknown={c.unknown} count={count} amount={amount} selectedRail={profile!.rail}/>)}
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl border border-amber-500/40 p-4 text-sm">Nous n’avons pas assez de données pour faire une présélection honnête. Passe en mode expert et contacte les fournisseurs.</p>
                )}
                <p className="mt-4 text-sm text-muted-foreground">
                  La présélection reflète uniquement les caractéristiques documentées dans notre inventaire, pas un classement de fiabilité. Une caractéristique inconnue n’équivaut pas à une incompatibilité.
                </p>
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
                  <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Chercher un fournisseur…" className="w-full bg-transparent py-1 text-sm outline-none"/>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                  <span className="sr-only">Catégorie</span>
                  <select value={category} onChange={e=>setCategory(e.target.value as 'all'|ProviderCategory)} className="w-full bg-transparent py-1 text-sm outline-none">
                    {categoryOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={onlyWithFees} onChange={e=>setOnlyWithFees(e.target.checked)} className="accent-emerald-700"/>
                Tarifs publics renseignés uniquement
              </label>
              <CalculatorInputs count={count} amount={amount} setCount={setCount} setAmount={setAmount}/>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {matching.map(provider=>(
                  <ProviderCard key={provider.id} provider={provider} why={provider.rails?.length?['Moyens documentés : '+provider.rails.map(r=>railLabels[r]).join(', ')]:[]} unknown={['Couverture exacte, KYC, délais de règlement et support non audités']} count={count} amount={amount}/>
                ))}
              </div>
              {matching.length===0 && <p className="mt-6 text-sm text-muted-foreground">Aucun résultat pour ces filtres. Efface la recherche ou désactive le filtre de tarifs.</p>}
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
