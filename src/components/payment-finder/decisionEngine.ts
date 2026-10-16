/**
 * Explainable, deterministic multi-criteria decision analysis for the Payment
 * Finder. This is NOT machine learning, a licensing check or a reliability test.
 * "Unknown" criteria are excluded from the measured mean but reduce evidence
 * coverage. They are never interpreted as false or as zero-cost.
 */
import {
  collectionFeeForRail, currentPaymentMethods, providers, rankProviders,
  simulateCollection, stackIntegration,
  type Candidate, type FinderProfile, type PaymentSimulation, type Priority,
  type Provider, type TechStack,
} from './catalog'

type Dimension = 'cost' | 'integration' | 'onboarding' | 'usecase' | 'future'
export type AssessedCriterion = {
  key: Dimension
  label: string
  weight: number
  /** null means "no comparative evidence", not a negative rating. */
  rating: number | null
  explanation: string
}
export type AssessedCandidate = Candidate & {
  /** Score from 0–100; unavailable if no dimension can be evaluated. */
  suitability: number | null
  /** Completeness of the criteria in this recommendation (0–100).
   * NOT confidence in service uptime, regulatory status, or vendor quality. */
  evidenceCoverage: number
  criteria: AssessedCriterion[]
  distinctiveness?: string
}
export const weightsByPriority: Record<Priority,Record<Dimension,number>> = {
  cost:        {cost:45,integration:15,onboarding:15,usecase:15,future:10},
  integration: {cost:10,integration:40,onboarding:25,usecase:15,future:10},
  coverage:    {cost:10,integration:15,onboarding:15,usecase:10,future:50},
  support:     {cost:5,integration:25,onboarding:30,usecase:25,future:15},
}
const names:Record<Dimension,string>={
  cost:'Coût estimé de collecte',
  integration:'Intégration technique',
  onboarding:'Parcours de démarrage',
  usecase:'Adéquation au type de projet',
  future:'Couverture future annoncée',
}
const clamp = (n:number)=>Math.max(0,Math.min(100,n))
const unique=<T,>(xs:T[]):T[]=>[...new Set(xs)]

/** Never compare a Mobile Money commission against a cards or payout request. */
function comparableCost(candidate:Candidate,profile:FinderProfile,simulation:PaymentSimulation|null):number|null {
  if(candidate.tier!=='documented'||(profile.need??'collect')!=='collect'||!simulation?.channels.length)return null
  const rails=currentPaymentMethods(profile)
  if(simulation.channels.length!==rails.length||
    !rails.every(rail=>simulation.channels.some(channel=>channel.rail===rail))) return null
  // Per-channel annual charges and cash-out costs are intentionally excluded.
  const result=simulateCollection(candidate.provider,simulation)
  return result.complete&&result.total!==null&&Number.isFinite(result.total)?result.total:null
}

export function assessProviders(profile:FinderProfile, simulation:PaymentSimulation|null=null):AssessedCandidate[] {
  const base=rankProviders(profile,simulation)
  const costPairs=base.map(candidate=>({id:candidate.provider.id,total:comparableCost(candidate,profile,simulation)}))
    .filter((c):c is {id:string;total:number}=>c.total!==null)
  const costs=costPairs.map(item=>item.total)
  const minCost=costs.length?Math.min(...costs):null
  const maxCost=costs.length?Math.max(...costs):null
  const costById=new Map(costPairs.map(item=>[item.id,item.total]))
  const future=unique(profile.futureRails??[]).filter(rail=>!currentPaymentMethods(profile).includes(rail))
  const active=weightsByPriority[profile.priority]
  const costApplies=(profile.need??'collect')==='collect'

  return base.map((candidate):AssessedCandidate=>{
    const provider=candidate.provider
    const integration=stackIntegration(provider,profile.stack)
    const stageDocumented=profile.stage==='mvp'
      ? Boolean(provider.sandbox)
      : profile.stage==='individual'
        ? Boolean(provider.individualPathSource)
        : Boolean(provider.businessKycSource)
    const fee=costById.get(provider.id)
    const costRating=fee===undefined?null:minCost===maxCost?75:
      clamp(100-70*((fee-minCost!)/(maxCost!-minCost!)))
    // Future rails are positive evidence of announced coverage, not a guarantee
    // of access for a Cameroon merchant.
    const futureKnown=future.length>0&&future.every(rail=>provider.rails?.includes(rail))
    const candidates: {key:Dimension; rating:number|null;explanation:string;active:boolean}[]=[
      {key:'cost',rating:costRating,active:costApplies,
        explanation:costRating===null?'Aucun coût comparable publié pour tout le volume choisi':
          'Comparaison relative des commissions publiées, hors retrait, taxes et frais annuels'},
      {key:'integration',rating:integration.kind==='native'?100:integration.kind==='rest'?75:null,active:true,
        explanation:integration.kind==='unknown'?'Stack non vérifiée':integration.label},
      {key:'onboarding',rating:stageDocumented?100:null,active:true,
        explanation:stageDocumented?'Parcours annoncé, activation non garantie':'Conditions de démarrage non vérifiées'},
      {key:'usecase',rating:provider.useCases?.includes(profile.useCase)?100:null,active:true,
        explanation:provider.useCases?.includes(profile.useCase)?'Cas d’usage cité dans le relevé éditorial':'Cas d’usage non documenté'},
      {key:'future',rating:futureKnown?100:null,active:future.length>0,
        explanation:future.length===0?'Aucun besoin futur demandé':futureKnown?'Moyens futurs annoncés':'Prise en charge future non vérifiée'},
    ]
    const dimensions=candidates.filter(c=>c.active)
    const possible=dimensions.reduce((total,c)=>total+active[c.key],0)
    const measured=dimensions.filter(c=>c.rating!==null)
    const knownWeight=measured.reduce((total,c)=>total+active[c.key],0)
    // The quality score is normalized for applicable criteria and discounted
    // for missing evidence. No unknown attribute receives a fabricated rating.
    const knownMean=knownWeight>0?measured.reduce((total,c)=>total+active[c.key]*c.rating!,0)/knownWeight:null
    const coverage=possible>0?knownWeight/possible:0
    const suitability=knownMean===null?null:Math.round(clamp(knownMean*(0.50+0.50*coverage)))
    const evidenceCoverage=Math.round(coverage*100)
    return {
      ...candidate,suitability,evidenceCoverage,
      criteria:dimensions.map(c=>({
        key:c.key,label:names[c.key],rating:c.rating,weight:active[c.key],
        explanation:c.explanation,
      })),
    }
  }).sort((a,b)=>
    Number(b.tier==='documented')-Number(a.tier==='documented') ||
    (b.suitability??-1)-(a.suitability??-1) ||
    b.evidenceCoverage-a.evidenceCoverage ||
    a.provider.name.localeCompare(b.provider.name,'fr')
  )
}

/** Diversity is a small reranker, never a hard quota. Only documented
 * candidates within 10 points of the next highest base score can compete.
 * A different category, integration path or fee transparency can provide
 * a useful alternative; unknown suppliers do not enter the shortlist.
 */
export function selectDiverseShortlist(ranked:readonly AssessedCandidate[],size=3):AssessedCandidate[] {
  const eligible=ranked.filter(c=>c.tier==='documented'&&c.suitability!==null)
  const chosen:AssessedCandidate[]=[]
  const remaining=[...eligible]
  while(chosen.length<size&&remaining.length>0) {
    const best=remaining.reduce((max,c)=>Math.max(max,c.suitability??0),0)
    const pool=remaining.filter(c=>(c.suitability??0)>=best-10)
    const integrationKind=(p:Provider,stack:TechStack)=>stackIntegration(p,stack).kind
    // Integration kind, rails breadth, pricing, and category provide several
    // useful archetypes without claiming any differences in service quality.
    const diversity=(candidate:AssessedCandidate)=>{
      if(!chosen.length)return 0
      const p=candidate.provider
      const previous=chosen.map(c=>c.provider)
      const categoryNew=previous.every(other=>other.category!==p.category)
      const sdkNew=previous.every(other=>other.stacks?.join(',')!==p.stacks?.join(','))
      const feeNew=previous.every(other=>Boolean(other.fee)!==Boolean(p.fee))
      const breadthNew=previous.every(other=>(other.rails?.length??0)!==(p.rails?.length??0))
      return (categoryNew?2:0)+(sdkNew?2:0)+(feeNew?2:0)+(breadthNew?1:0)
    }
    // Score dominates; diversity only breaks close recommendations.
    pool.sort((a,b)=>((b.suitability??0)+diversity(b))-((a.suitability??0)+diversity(a)) ||
      b.evidenceCoverage-a.evidenceCoverage || a.provider.name.localeCompare(b.provider.name,'fr'))
    const next=pool[0]
    chosen.push(next)
    remaining.splice(remaining.findIndex(c=>c.provider.id===next.provider.id),1)
  }
  return chosen
}
