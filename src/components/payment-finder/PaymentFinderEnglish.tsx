'use client'

import {useId,useMemo,useState,type FormEvent} from 'react'
import {ArrowLeft,ArrowRight,ExternalLink,Search,RotateCcw} from 'lucide-react'
import {
  providers, currentPaymentMethods, simulateCollection, stackIntegration,
  type UseCase, type PaymentMethod, type TechStack, type BusinessStage,
  type PaymentNeed, type Priority, type FinderProfile, type Provider,
  type PaymentSimulation, type ProviderCategory,
} from './catalog'
import {assessProviders,selectDiverseShortlist,type AssessedCandidate} from './decisionEngine'
import {ProviderLogo} from './ProviderLogo'

const names={
  useCase:{
    saas:'A SaaS application', commerce:'An online store', marketplace:'A marketplace',
    freelance:'Freelance services',agency:'Apps for multiple clients',
  } as Record<UseCase,string>,
  rail:{mobile:'Mobile Money',cards:'Bank cards',international:'International payments'} as Record<PaymentMethod,string>,
  stack:{
    python:'Python / Django / FastAPI',node:'Node.js / TypeScript',php:'PHP / WordPress',
    mobile:'Flutter / Dart',kotlin:'Kotlin / Android',go:'Go',java:'Java / Spring',
    dotnet:'C# / .NET',other:'Other language / REST API',noCode:'No-code',
  } as Record<TechStack,string>,
  stage:{mvp:'I am testing an MVP', individual:'Selling without a registered company',
    company:'My company is registered'} as Record<BusinessStage,string>,
  need:{collect:'Collect customer payments',payout:'Send funds to beneficiaries',bulk:'Pay many beneficiaries',
    multiService:'Manage several client apps',subscription:'Manage recurring renewals',split:'Split marketplace revenue'} as Record<PaymentNeed,string>,
  priority:{cost:'Transaction costs',integration:'Easy integration',support:'Operational support',
    coverage:'Payment coverage'} as Record<Priority,string>,
  category:{gateway:'Payment gateway / merchant product',infrastructure:'B2B infrastructure',
    orchestrator:'Payment orchestrator',adjacent:'Specialised fintech'} as Record<ProviderCategory,string>,
}
const steps=[
  {key:'useCase',title:'What are you building?'},
  {key:'rails',title:'Which payment methods do you need now and later?'},
  {key:'stack',title:'Which tech stack are you using?'},
  {key:'stage',title:'What is your business status?'},
  {key:'need',title:'What must your payment system actually do?'},
  {key:'priority',title:'What matters most to you?'},
] as const
type Step=typeof steps[number]['key']
const needsByCase:Record<UseCase,PaymentNeed[]>={
  saas:['collect','subscription','payout'],
  commerce:['collect','payout'],
  marketplace:['collect','split','payout','bulk'],
  freelance:['collect','payout'],
  agency:['collect','multiService','bulk','payout'],
}
const currency=(v:number)=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(v)+' XAF'

function PriceBlock({provider,simulation}:{provider:Provider;simulation:PaymentSimulation|null}){
  if(!simulation)return <p className="text-xs text-muted-foreground">Run the fee simulation to see available estimates.</p>
  const result=simulateCollection(provider,simulation)
  return <div className="rounded-lg bg-muted/60 p-3 text-xs">
    <p className="font-semibold">{result.complete?'Estimated collection fees':'Partial estimate only'}</p>
    {result.lines.map(line=><div key={line.rail} className="mt-2 flex justify-between gap-2">
      <span>{names.rail[line.rail]}</span>
      <span className="font-semibold">{line.estimate===null?'Rate not documented':currency(line.estimate)}</span>
    </div>)}
    {result.total!==null && <p className="mt-2 border-t border-border pt-2 font-semibold">Total: {currency(result.total)}</p>}
    {provider.fee?.annualXaf && <p className="mt-2 text-muted-foreground">+ {currency(provider.fee.annualXaf)} advertised annual charge, excluded.</p>}
    {!result.complete && <p className="mt-2 text-muted-foreground">Unknown is not zero. Withdrawal fees, taxes and FX are excluded.</p>}
  </div>
}

function CandidateCard({candidate,profile,simulation}:{candidate:AssessedCandidate;profile:FinderProfile;simulation:PaymentSimulation|null}){
  const p=candidate.provider
  return <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
    <div className="flex items-center gap-3"><ProviderLogo provider={p}/><div className="min-w-0"><h4 className="font-semibold">{p.name}</h4><p className="text-xs text-muted-foreground">{names.category[p.category]}</p></div></div>
    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3">
      <div><p className="text-xs text-muted-foreground">Indicative fit</p><p className="font-semibold text-xl tabular-nums">{candidate.suitability??'—'} / 100</p></div>
      <div><p className="text-xs text-muted-foreground">Evidence coverage</p><p className="font-semibold text-xl tabular-nums">{candidate.evidenceCoverage}%</p></div>
    </div>
    <div className="space-y-1 text-xs">
      <p>Technical path: {stackIntegration(p,profile.stack).kind==='unknown'?'Not documented':stackIntegration(p,profile.stack).kind==='native'?'SDK / published integration':'REST API via backend'}</p>
      {candidate.known.slice(0,2).map(t=><p key={t} className="text-muted-foreground">Verified criterion: {t}</p>)}
    </div>
    <PriceBlock provider={p} simulation={simulation}/>
    <details className="text-xs"><summary className="cursor-pointer font-semibold">See the score and missing evidence</summary>
      <div className="mt-2 space-y-2">{candidate.criteria.map(c=><p key={c.key}><strong>{c.label}</strong> · weight {c.weight} · {c.rating===null?'Unknown':c.rating+'/100'}<span className="block text-muted-foreground">{c.explanation}</span></p>)}</div>
      <p className="mt-2 text-muted-foreground">{candidate.unknown.join(' · ')}</p>
    </details>
    {p.source && <a href={p.source} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1 text-sm font-semibold underline">Official site or documentation <ExternalLink size={14}/></a>}
  </article>
}

export function PaymentFinderEnglish({embedded=false}:{embedded?:boolean}){
  const id=useId()
  const [mode,setMode]=useState<'guided'|'expert'>('guided')
  const [step,setStep]=useState(0)
  const [answers,setAnswers]=useState<Partial<FinderProfile>>({currentRails:['mobile'],futureRails:[]})
  const [count,setCount]=useState(100)
  const [amount,setAmount]=useState(10000)
  const [simulation,setSimulation]=useState<PaymentSimulation|null>(null)
  const [query,setQuery]=useState('')
  const [filter,setFilter]=useState<ProviderCategory|'all'>('all')
  const [compared,setCompared]=useState<string[]>([])
  const [shown,setShown]=useState(15)
  const complete=step===steps.length
  const profile=complete?answers as FinderProfile:null
  const rails=profile?currentPaymentMethods(profile):['mobile'] as PaymentMethod[]
  const validSimulation=simulation && simulation.channels.length===rails.length &&
    simulation.channels.every(c=>rails.includes(c.rail))?simulation:null
  const ranked=useMemo(()=>profile?assessProviders(profile,validSimulation):[],[profile,validSimulation])
  const picks=selectDiverseShortlist(ranked)
  const leads=ranked.filter(c=>c.tier==='investigate'&&(c.provider.useCases?.includes(profile?.useCase??'saas') || c.provider.rails?.some(rail=>rails.includes(rail as PaymentMethod)))).slice(0,4)
  const filtered=useMemo(()=>providers.filter(p=>
    (filter==='all'||p.category===filter)&&p.name.toLowerCase().includes(query.trim().toLowerCase())
  ),[filter,query])
  const selected=compared.map(id=>providers.find(p=>p.id===id)).filter((p):p is Provider=>Boolean(p))
  function toggleCompare(id:string){setCompared(old=>old.includes(id)?old.filter(x=>x!==id):old.length<3?[...old,id]:old)}
  function choose(key:Exclude<Step,'rails'>,value:string){
    setAnswers(old=>({...old,[key]:value, ...(key==='useCase'?{need:undefined}:{})}))
    setStep(n=>n+1)
  }
  function toggleRail(rail:PaymentMethod,period:'currentRails'|'futureRails'){
    setAnswers(old=>{
      const prev=old[period]??[]
      const other=period==='currentRails'?'futureRails':'currentRails'
      return {...old,[period]:prev.includes(rail)?prev.filter(r=>r!==rail):[...prev,rail],[other]:(old[other]??[]).filter(r=>r!==rail)}
    })
    setSimulation(null)
  }
  function run(e:FormEvent<HTMLFormElement>){e.preventDefault();setSimulation({channels:rails.map(rail=>({rail,count,amountXaf:amount}))})}
  function reset(){setStep(0);setAnswers({currentRails:['mobile'],futureRails:[]});setSimulation(null)}
  const useCase=answers.useCase??'saas'
  const opt:Record<Exclude<Step,'rails'>,string[]>={
    useCase:Object.keys(names.useCase),stack:Object.keys(names.stack),stage:Object.keys(names.stage),
    need:needsByCase[useCase],priority:Object.keys(names.priority),
  }
  const label=(key:Exclude<Step,'rails'>,option:string)=>names[key][option as never]
  return <section aria-labelledby={id+'-title'} lang="en" className={embedded?'not-prose relative left-1/2 my-12 w-[min(1120px,calc(100vw-2rem))] -translate-x-1/2':'mx-auto w-full max-w-6xl'}>
    <div className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground">
      <header className="bg-[#102e48] p-5 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/75">Trigenys Insight · Payment Finder</p>
        <h2 id={id+'-title'} className="mt-2 text-2xl font-bold text-white sm:text-3xl">Find the right payment integration for your business.</h2>
        <p className="mt-3 text-sm leading-6 text-white/80">63 leads, guided choices and a fee calculator. Missing information stays unknown — never zero or unsupported.</p>
        <div className="mt-5 flex gap-2">
          <button type="button" aria-pressed={mode==='guided'} onClick={()=>setMode('guided')} className={'rounded-full px-4 py-2 text-sm font-semibold '+(mode==='guided'?'bg-white text-[#102e48]':'border border-white/30 text-white')}>Guided finder</button>
          <button type="button" aria-pressed={mode==='expert'} onClick={()=>setMode('expert')} className={'rounded-full px-4 py-2 text-sm font-semibold '+(mode==='expert'?'bg-white text-[#102e48]':'border border-white/30 text-white')}>Explore all 63</button>
        </div>
      </header>
      <div className="p-4 sm:p-7">
        {mode==='guided' && !complete && <div>
          <p className="mb-4 text-xs text-muted-foreground">Step {step+1} of {steps.length}</p>
          <div className="mb-6 grid grid-cols-6 gap-1" aria-hidden="true">{steps.map((s,i)=><span key={s.key} className={'h-1.5 rounded-full '+(i<=step?'bg-[#147ba6]':'bg-muted')}/>)}</div>
          <h3 className="text-xl font-semibold">{steps[step].title}</h3>
          {steps[step].key==='rails' ? <div className="mt-5 space-y-4">
            {(['currentRails','futureRails'] as const).map(period=><fieldset key={period} className="rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold">{period==='currentRails'?'Accept now (choose one or more)':'Add later (optional)'}</legend>
              <div className="flex flex-wrap gap-2">{(Object.keys(names.rail) as PaymentMethod[]).map(rail=><label key={rail} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input type="checkbox" checked={(answers[period]??[]).includes(rail)} onChange={()=>toggleRail(rail,period)}/>{names.rail[rail]}
              </label>)}</div>
            </fieldset>)}
            <button type="button" disabled={!answers.currentRails?.length} onClick={()=>setStep(s=>s+1)} className="rounded-xl bg-[#102e48] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Continue <ArrowRight size={15} className="inline"/></button>
          </div> : <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {opt[steps[step].key as Exclude<Step,'rails'>].map(value=><button key={value} type="button" onClick={()=>choose(steps[step].key as Exclude<Step,'rails'>,value)}
              className="flex min-h-14 items-center justify-between rounded-xl border border-border p-4 text-left text-sm font-medium hover:border-[#147ba6]">
              {label(steps[step].key as Exclude<Step,'rails'>,value)}<ArrowRight size={16}/>
            </button>)}
          </div>}
          <div className="mt-6 flex justify-between">
            <button type="button" disabled={step===0} onClick={()=>setStep(s=>s-1)} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40"><ArrowLeft size={15} className="inline"/> Back</button>
            <button type="button" onClick={reset} className="text-sm text-muted-foreground"><RotateCcw size={15} className="inline"/> Start over</button>
          </div>
        </div>}
        {mode==='guided' && complete && profile && <div>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-semibold">Your personalised shortlist</h3><p className="mt-1 text-sm text-muted-foreground">{names.useCase[profile.useCase]} · {names.stage[profile.stage]} · {names.need[profile.need??'collect']}</p></div>
            <button type="button" onClick={()=>setStep(0)} className="rounded-lg border border-border px-3 py-2 text-sm">Change answers</button></div>
          <form onSubmit={run} className="mt-5 rounded-xl border border-border bg-muted/25 p-4">
            <p className="mb-3 text-sm font-semibold">Estimate collection fees</p>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Number of payments<input type="number" required min="1" max="100000" value={count} onChange={e=>setCount(Math.min(100000,Math.max(1,Math.floor(Number(e.target.value)||1))))} className="mt-1 block w-full rounded-lg border border-border bg-background p-3 text-base text-foreground"/></label>
              <label className="text-xs text-muted-foreground">Average payment amount (XAF)<input type="number" required min="1" max="100000000" value={amount} onChange={e=>setAmount(Math.min(100000000,Math.max(1,Math.floor(Number(e.target.value)||1))))} className="mt-1 block w-full rounded-lg border border-border bg-background p-3 text-base text-foreground"/></label>
            </div>
            <button type="submit" className="mt-4 rounded-xl bg-[#102e48] px-5 py-3 text-sm font-semibold text-white">Run fee simulation</button>
            <p className="mt-2 text-xs text-muted-foreground">Volume across selected current methods. Estimates exclude withdrawals, applicable taxes and FX; published fees are not contract quotes.</p>
          </form>
          {picks.length>0?<div className="mt-6 grid gap-3 lg:grid-cols-3">{picks.map(c=><CandidateCard key={c.provider.id} candidate={c} profile={profile} simulation={validSimulation}/>)}</div>
            :<p className="mt-5 rounded-lg border border-amber-400/50 bg-amber-500/5 p-4 text-sm">There is not enough verified evidence to recommend a provider for this exact combination. This does not mean no provider can support it.</p>}
          <p className="mt-4 text-xs text-muted-foreground">Fit scores use documented criteria only. Evidence coverage is data completeness, not measured uptime, service quality or regulatory approval.</p>
          {leads.length>0 && <details className="mt-4 rounded-lg border border-border p-4"><summary className="cursor-pointer font-semibold text-sm">Other providers worth contacting (evidence incomplete)</summary><div className="mt-3 flex flex-wrap gap-2">{leads.map(c=><span key={c.provider.id} className="rounded-full bg-muted px-3 py-2 text-xs">{c.provider.name}</span>)}</div></details>}
          <button type="button" onClick={()=>setMode('expert')} className="mt-5 rounded-xl border border-border px-4 py-3 text-sm font-semibold">Browse the complete directory <ArrowRight size={15} className="inline"/></button>
        </div>}
        {mode==='expert' && <div>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-semibold">Provider directory</h3><p className="mt-1 text-sm text-muted-foreground">These 63 entries include payment products, infrastructure, orchestrators and unverified projects.</p></div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs">{filtered.length} / {providers.length}</span></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"><Search size={16}/><span className="sr-only">Search provider</span><input value={query} onChange={e=>{setQuery(e.target.value);setShown(15)}} placeholder="Search a provider" className="w-full bg-transparent text-sm outline-none"/></label>
            <label className="rounded-lg border border-border px-3 py-2"><span className="sr-only">Provider type</span><select value={filter} onChange={e=>{setFilter(e.target.value as ProviderCategory|'all');setShown(15)}} className="w-full bg-background text-sm outline-none"><option value="all">All categories</option>{(Object.keys(names.category) as ProviderCategory[]).map(c=><option key={c} value={c}>{names.category[c]}</option>)}</select></label>
          </div>
          {selected.length>0 && <div className="mt-4 overflow-auto rounded-lg border border-border p-3"><p className="mb-3 text-sm font-semibold">Compare up to three providers</p><table className="min-w-[550px] w-full text-left text-xs"><thead><tr><th className="p-2">Criterion</th>{selected.map(p=><th className="p-2" key={p.id}>{p.name}<button type="button" className="ml-2 underline" onClick={()=>toggleCompare(p.id)}>Remove</button></th>)}</tr></thead><tbody>{[
            ['Category',(p:Provider)=>names.category[p.category]],
            ['Payment methods',(p:Provider)=>p.rails?.map(x=>names.rail[x as PaymentMethod]??x).join(', ')??'Unknown'],
            ['SDK / REST',(p:Provider)=>p.stacks?.length||p.restSource?'Documented':'Unknown'],
            ['Sandbox',(p:Provider)=>p.sandbox?'Described':'Unknown'],
            ['Individual KYC',(p:Provider)=>p.individualPathSource?'Described':'Unknown'],
            ['Mobile Money fee',(p:Provider)=>p.fee?String(p.fee.percent)+'%'+(p.fee.perTransactionXaf?' + '+p.fee.perTransactionXaf+' XAF':''):'Unknown'],
            ].map(([title,make])=><tr key={title as string}><th className="border-t border-border p-2">{title as string}</th>{selected.map(p=><td key={p.id} className="border-t border-border p-2">{(make as (p:Provider)=>string)(p)}</td>)}</tr>)}</tbody></table></div>}
          <div className="mt-4 overflow-hidden rounded-xl border border-border">{filtered.slice(0,shown).map(p=><div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-border p-3 last:border-0">
            <ProviderLogo provider={p} compact/><div className="min-w-0 flex-1"><p className="font-semibold text-sm">{p.name}</p><p className="text-xs text-muted-foreground">{names.category[p.category]}</p></div>
            <span className="text-xs text-muted-foreground">{p.fee?String(p.fee.percent)+'% advertised':'Fee not documented'}</span>
            <button type="button" disabled={compared.length>=3&&!compared.includes(p.id)} onClick={()=>toggleCompare(p.id)} aria-pressed={compared.includes(p.id)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-40">{compared.includes(p.id)?'Remove':'Compare'}</button>
            {p.source && <a href={p.source} target="_blank" rel="noopener noreferrer" aria-label={'Documentation for '+p.name}><ExternalLink size={16}/></a>}
          </div>)}</div>
          {shown<filtered.length && <button type="button" onClick={()=>setShown(n=>n+15)} className="mt-4 w-full rounded-lg border border-border p-3 text-sm font-semibold">Show more ({filtered.length-shown} remaining)</button>}
          {filtered.length===0 && <p className="mt-4 text-sm text-muted-foreground">No matching providers. Try a broader search.</p>}
        </div>}
      </div>
      <footer className="border-t border-border bg-muted/25 p-4 text-xs leading-5 text-muted-foreground sm:px-7">
        Editorial data, October 2026. No real transactions or independent KYC/SAV tests have been conducted. Published payment fees may change; confirm production access and regulations directly with the provider.
      </footer>
    </div>
  </section>
}
