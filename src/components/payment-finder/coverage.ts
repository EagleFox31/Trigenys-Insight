import {
  collectionFeeForRail, currentPaymentMethods, providers, rankProviders,
  type FinderProfile, type PaymentMethod,
} from './catalog'

/** Counts describe our editorial dataset, never the whole payment market. */
export const catalogCoverage = {
  total:providers.length,
  methods:providers.filter(provider => provider.rails?.length).length,
  mobileFees:providers.filter(provider => collectionFeeForRail(provider,'mobile')).length,
  cardFees:providers.filter(provider => collectionFeeForRail(provider,'cards')).length,
}

export function previewCoverage(answers:Partial<FinderProfile>) {
  const rails = answers.currentRails !== undefined ? [...new Set(answers.currentRails)] :
    answers.rail ? currentPaymentMethods({rail:answers.rail}) : []
  if (rails.length === 0) return null
  const profile:FinderProfile = {
    useCase:answers.useCase??'saas', rail:rails[0], currentRails:rails,
    futureRails:answers.futureRails, stack:answers.stack??'other',
    stage:answers.stage??'company', need:answers.need??'collect',
    priority:answers.priority??'integration',
  }
  // Reuse the exact eligibility rules of V2. Unanswered steps add no KYC or
  // special-operation requirement; their later answers can narrow the count.
  const candidates=rankProviders(profile).filter(candidate => candidate.tier==='documented')
  const methodsOnly=rankProviders({...profile,stage:'company',need:'collect'})
    .filter(candidate => candidate.tier==='documented')
  const withStage=rankProviders({...profile,need:'collect'})
    .filter(candidate => candidate.tier==='documented')
  const reason = methodsOnly.length===0 ? 'methods' : withStage.length===0 ? 'stage' : 'operation'
  const priced=candidates.filter(candidate => rails.every(rail => collectionFeeForRail(candidate.provider,rail)))
  return {rails, count:candidates.length, priced:profile.need==='collect'?priced.length:null, reason,
    complete:!!answers.stage && !!answers.need}
}

export function deferInternational(answers:Partial<FinderProfile>) {
  const currentRails=(answers.currentRails??[]).filter(rail => rail!=='international')
  const futureRails:PaymentMethod[]=[...new Set([...(answers.futureRails??[]),'international' as const])]
  return {...answers,currentRails,futureRails,rail:currentRails[0]}
}
