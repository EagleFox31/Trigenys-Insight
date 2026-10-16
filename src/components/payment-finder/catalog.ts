/**
 * Editorial snapshot, 16 October 2026. A lead in this inventory is NOT an
 * active, licensed provider. Only explicitly documented characteristics are
 * marked as known. Unknown is never treated as "no" or as a zero-fee quote.
 *
 * Keep this module side-effect-free so comparison rules can be unit-tested.
 */
export type UseCase = 'saas' | 'commerce' | 'marketplace' | 'freelance' | 'agency'
export type PaymentRail = 'mobile' | 'mobileCards' | 'cards' | 'international'
export type PaymentMethod = Exclude<PaymentRail, 'mobileCards'>
export type TechStack = 'python' | 'node' | 'php' | 'mobile' | 'kotlin' | 'go' | 'java' | 'dotnet' | 'other' | 'noCode'
export type BusinessStage = 'mvp' | 'individual' | 'company'
export type PaymentNeed = 'collect' | 'payout' | 'bulk' | 'multiService' | 'subscription' | 'split'
export type Priority = 'cost' | 'integration' | 'support' | 'coverage'
export type ProviderCategory = 'gateway' | 'infrastructure' | 'orchestrator' | 'adjacent'

export type Fee = {
  /** A publicly advertised collection fee: not an all-in price or quote. */
  percent: number
  perTransactionXaf?: number
  annualXaf?: number
  source: string
}
export type Provider = {
  id: string
  name: string
  category: ProviderCategory
  source?: string
  /** Proven features only; absence means NOT VERIFIED, not unsupported. */
  rails?: PaymentRail[]
  stacks?: TechStack[]
  /** Language-independent HTTP integration, distinct from an official SDK. */
  restSource?: string
  stackSources?: Partial<Record<TechStack, string>>
  useCases?: UseCase[]
  sandbox?: boolean
  /** Explicit published individual/unregistered onboarding path, not approval. */
  individualPath?: boolean
  individualPathSource?: string
  businessKycSource?: string
  /** Documented product capabilities; absence is unverified, never incompatible. */
  capabilities?: Partial<Record<Exclude<PaymentNeed,'collect'>, string>>
  fee?: Fee
  fees?: Partial<Record<PaymentMethod, Fee>>
}
export type FinderProfile = {
  useCase: UseCase
  rail: PaymentRail
  currentRails?: PaymentMethod[]
  futureRails?: PaymentMethod[]
  stack: TechStack
  stage: BusinessStage
  need?: PaymentNeed
  priority: Priority
}

const list: Provider[] = [
  // A — Gateways and merchant collection products (48)
  { id:'fapshi', restSource:'https://docs.fapshi.com/en/api-reference/getting-started', name:'Fapshi', category:'gateway', source:'https://www.fapshi.com/en', rails:['mobile'], stacks:['other'], useCases:['saas','commerce'], sandbox:true, individualPath:true, individualPathSource:'https://www.fapshi.com/en/help-and-support/topics/account', businessKycSource:'https://www.fapshi.com/en/help-and-support/topics/account', fee:{ percent:3, source:'https://www.fapshi.com/fr/nos-tarifs'} },
  { id:'mesomb', restSource:'https://docs.mesomb.com/development/authentication', name:'MeSomb', category:'gateway', source:'https://docs.mesomb.com/', rails:['mobile'], stacks:['python','node','php','mobile','kotlin','java'], stackSources:{kotlin:'https://github.com/hachther/mesomb-kotlin'}, useCases:['saas','commerce','agency'], sandbox:true, capabilities:{multiService:'https://docs.mesomb.com/fr/products/payments/register-service',payout:'https://docs.mesomb.com/development'}, },
  { id:'notch-pay', restSource:'https://developer.notchpay.co', name:'Notch Pay', category:'gateway', source:'https://www.notchpay.co/pricing', rails:['mobile','cards'], stacks:['php'], useCases:['commerce','saas'], fee:{percent:2,source:'https://www.notchpay.co/pricing'} },
  { id:'monetbil', name:'Monetbil', category:'gateway', source:'https://www.monetbil.com', rails:['mobile'], useCases:['commerce'] },
  { id:'payunit', restSource:'https://developer.payunit.net/', name:'PayUnit', category:'gateway', source:'https://developer.payunit.net/', rails:['mobile','cards'], stacks:['python','node','php','mobile'], useCases:['commerce','saas'], sandbox:true, individualPath:true, individualPathSource:'https://developer.payunit.net/kyc', businessKycSource:'https://developer.payunit.net/kyc' },
  { id:'flutterwave', name:'Flutterwave', category:'gateway', source:'https://www.flutterwave.com', useCases:['commerce'] },
  { id:'campay', restSource:'https://documenter.getpostman.com/view/2391374/T1LV8PVA', name:'CamPay', category:'gateway', source:'https://www.campay.net/fr/', rails:['mobile'], stacks:['python','php','kotlin'], stackSources:{kotlin:'https://github.com/CamPay/android-sdk'}, useCases:['commerce','saas'], fee:{percent:2,source:'https://www.campay.net/fr/'} },
  { id:'cinetpay', name:'CinetPay', category:'gateway', source:'https://docs.cinetpay.com/', rails:['mobile','cards'], useCases:['commerce','saas'] },
  { id:'mmgate', name:'MMGate', category:'gateway', source:'https://www.mmgate.org' },
  { id:'dropme', name:'Dropme', category:'gateway', source:'https://dropme.cm/fr/developers', rails:['mobile'], stacks:['other'] },
  { id:'zopay', name:'ZoPay', category:'gateway', source:'https://zopay.co/docs/getting-started/introduction' },
  { id:'my-coolpay', name:'My-CoolPay', category:'gateway', source:'https://my-coolpay.com/fr/api/tarifs', rails:['mobile','cards'], stacks:['php'], useCases:['commerce'], fee:{percent:1.8,annualXaf:10000,source:'https://my-coolpay.com/fr/api/tarifs'}, fees:{cards:{percent:4,source:'https://my-coolpay.com/fr/api/tarifs'}} },
  { id:'dohone', name:'Dohone', category:'gateway', source:'https://www.my-dohone.com' },
  { id:'elyonpay', name:'ElyonPay', category:'gateway', source:'https://docs.elyonpay.com/fr/', rails:['mobile','cards'], stacks:['python','node','mobile'], useCases:['saas','commerce'], sandbox:true },
  { id:'getmipay', name:'GetMiPay', category:'gateway', source:'https://getmipay.com/developers' },
  { id:'walleopay', name:'WalleoPay', category:'gateway', source:'https://walleopay.com', rails:['mobile'] },
  { id:'nokash', name:'NOKASH', category:'gateway', source:'https://nokash.co' },
  { id:'kola', name:'Kola', category:'gateway', source:'https://bikusgroup.com/realisations/kola' },
  { id:'ktcpay', name:'KTCPay', category:'gateway', source:'https://ktcpay.net' },
  { id:'paynote', name:'Paynote / Y-Note', category:'gateway', source:'https://www.paynote.africa/documentation-paynote.html', rails:['mobile'], useCases:['saas'] },
  { id:'tranzak', name:'Tranzak Cameroon', category:'gateway', source:'https://docs.developer.tranzak.me/', rails:['mobile'], useCases:['agency','saas'], capabilities:{payout:'https://docs.developer.tranzak.me/',bulk:'https://docs.developer.tranzak.me/'} },
  { id:'bui', restSource:'https://docs.buicorporation.io/transaction/service.html', name:'BUI Corporation', category:'gateway', source:'https://docs.buicorporation.io/', rails:['mobile'], stacks:['python','node','other'], useCases:['saas'], capabilities:{payout:'https://docs.buicorporation.io/transaction/service.html'} },
  { id:'sp-heavy', name:'SP-Heavy', category:'gateway', source:'https://www.yukwaindustries.org/' },
  { id:'camerpay', name:'CamerPay', category:'gateway', source:'https://camerpay.biz', useCases:['commerce'] },
  { id:'nexpay', name:'Nexpay', category:'gateway', source:'https://pay.nexbyt.com' },
  { id:'paymooney', name:'Paymooney', category:'gateway', source:'https://api-doc.paymooney.com/' },
  { id:'nelsiuspay', name:'NelsiusPay', category:'gateway', source:'https://nelsiuspay.com/fr', useCases:['marketplace'] },
  { id:'afrigate', name:'AfriGate', category:'gateway', source:'https://www.afrigate.co/fr/' },
  { id:'intasend', name:'IntaSend', category:'gateway', source:'https://developers.intasend.com/countries/cameroon/' },
  { id:'kkiapay', name:'KKiaPay', category:'gateway', source:'https://kkiapay.me' },
  { id:'digitalispay', name:'DigitalisPay', category:'gateway' },
  { id:'zitopay', restSource:'https://zitopay.africa/docs', name:'ZITOPAY', category:'gateway', source:'https://zitopay.africa/docs', rails:['mobile','cards'], stacks:['php','other'], useCases:['commerce','saas'], individualPath:true, individualPathSource:'https://zitopay.africa/faqs', businessKycSource:'https://zitopay.africa/faqs', fee:{percent:2.6,perTransactionXaf:10,source:'https://zitopay.africa/pricing'}, fees:{cards:{percent:3.7,perTransactionXaf:20,source:'https://zitopay.africa/pricing'}} },
  { id:'moala', name:'MOALA', category:'gateway', source:'https://docs.moala.africa/fr/docs/introduction/', stacks:['php','other'], useCases:['saas','agency'] },
  { id:'adwapay', name:'AdwaPay', category:'gateway', source:'https://www.adwapay.com/' },
  { id:'enkap', name:'e-nkap', category:'gateway', source:'https://www.enkap.cm' },
  { id:'soleaspay', name:'SoleasPay', category:'gateway', source:'https://mysoleas.com' },
  { id:'jonalepay', name:'JonalePay', category:'gateway', source:'https://www.jonalepay.com' },
  { id:'drimzwallet', name:'DrimzWallet', category:'gateway', source:'https://www.drimzwallet.com' },
  { id:'wazapay', name:'WaZaPAY', category:'gateway', source:'https://www.wazapay.net' },
  { id:'kratos', name:'Kratos Pay', category:'gateway' },
  { id:'xfin', name:'XFIN', category:'gateway', source:'https://www.xfin.pro/' },
  { id:'trustpayway', name:'TrustPayWay', category:'gateway', source:'https://trustpayway.com/developers.php', rails:['mobile'], stacks:['python','node','other'] },
  { id:'deaconpay', name:'DeaconPay', category:'gateway', source:'https://www.deaconpay.com' },
  { id:'codees', name:'Codees Pay', category:'gateway', source:'https://pay.codees-cm.com', rails:['mobile'] },
  { id:'dusupay', name:'DusuPay', category:'gateway', source:'https://developer.dusupay.com/', rails:['mobile'] },
  { id:'elemipay', name:'ElemiPay', category:'gateway', source:'https://www.elemitech.com' },
  { id:'payonus', name:'PayOnUs', category:'gateway', source:'https://payonus.com/docs', sandbox:true },
  { id:'porsa', name:'Porsa', category:'gateway', source:'https://porsa.io/fr/products/payments' },
  // B — B2B rails and infrastructure (8)
  { id:'pawapay', name:'PawaPay', category:'infrastructure', source:'https://www.pawapay.io', rails:['mobile'], useCases:['marketplace'] },
  { id:'maviance', name:'Maviance / Smobilpay', category:'infrastructure', source:'https://maviance.com/solutions/smobilpay/' },
  { id:'hub2', name:'HUB2', category:'infrastructure', source:'https://www.hub2.io/fr/' },
  { id:'bizao', name:'Bizao', category:'infrastructure', source:'https://www.bizao.com' },
  { id:'kang', name:'Kang Open Banking', category:'infrastructure', source:'https://kangopenbanking.com/api-catalog' },
  { id:'digitwace', name:'DigitWace / WacePay', category:'infrastructure', source:'https://digitwace.com' },
  { id:'beyonic', name:'Beyonic', category:'infrastructure' },
  { id:'softeller', name:'Softeller', category:'infrastructure', source:'https://www.softeller.com' },
  // C — orchestration (4)
  { id:'cartflox', name:'Cartflox', category:'orchestrator', source:'https://cartflox.com' },
  { id:'zayono', name:'Zayono', category:'orchestrator', source:'https://www.zayono.com/' },
  { id:'simiz', name:'Simiz', category:'orchestrator', source:'https://simiz.io' },
  { id:'paycore', name:'PAYCORE', category:'orchestrator', source:'https://paycore.space/' },
  // D — related fintech products (3)
  { id:'diool', name:'Diool', category:'adjacent', source:'https://www.diool.com/' },
  { id:'suprapay', name:'SupraPay', category:'adjacent', source:'https://www.suprapay.io/', rails:['international'], useCases:['freelance'] },
  { id:'wakapay', name:'WakaPay', category:'adjacent', source:'https://wakapay.cash' },
]

export const providers: readonly Provider[] = list
export const categoryLabels: Record<ProviderCategory, string> = {
  gateway:'Passerelle / produit marchand',
  infrastructure:'Infrastructure B2B',
  orchestrator:'Orchestrateur',
  adjacent:'Fintech spécialisée',
}
export const railLabels: Record<PaymentRail, string> = {
  mobile:'Mobile Money', mobileCards:'Mobile Money + cartes', cards:'Cartes bancaires', international:'Paiements internationaux',
}
export const stackLabels: Record<TechStack, string> = {
  python:'Python / Django / FastAPI', node:'Node.js / TypeScript', php:'PHP / WordPress',
  mobile:'Flutter / Dart', kotlin:'Kotlin / Android', go:'Go', java:'Java / Spring', dotnet:'C# / .NET', other:'Autre langage / API REST', noCode:'No-code',
}
export const useCaseLabels: Record<UseCase, string> = {
  saas:'Un SaaS', commerce:'Une boutique e-commerce', marketplace:'Une marketplace',
  freelance:'Une activité freelance', agency:'Des projets pour mes clients',
}
export const stageLabels: Record<BusinessStage, string> = {
  mvp:'Un MVP en cours de test', individual:'Je vends sans société enregistrée',
  company:'Une entreprise enregistrée',
}
export const needLabels: Record<PaymentNeed, string> = {
  collect:'Encaisser des clients', payout:'Décaisser vers des bénéficiaires',
  bulk:'Verser à plusieurs bénéficiaires en une opération',multiService:'Gérer plusieurs applications / clients',
  subscription:'Gérer les renouvellements récurrents',split:'Répartir automatiquement entre vendeurs',
}
export const priorityLabels: Record<Priority, string> = {
  cost:'Les frais', integration:'Intégrer rapidement', support:'Le support et la fiabilité',
  coverage:'La diversité des paiements',
}

export type Candidate = {
  provider: Provider
  score: number
  /** Complete evidence for key criteria, not a regulatory or availability guarantee. */
  tier: 'documented' | 'investigate'
  known: string[]
  unknown: string[]
  evidence: { label: string; url: string }[]
}

export function currentPaymentMethods(profile: Pick<FinderProfile, 'rail' | 'currentRails'>): PaymentMethod[] {
  if (profile.currentRails?.length) return [...new Set(profile.currentRails)]
  return profile.rail === 'mobileCards' ? ['mobile', 'cards'] : [profile.rail]
}

export function togglePlannedMethod(
  plan: {currentRails?: PaymentMethod[]; futureRails?: PaymentMethod[]},
  period: 'currentRails' | 'futureRails',
  rail: PaymentMethod,
): {currentRails: PaymentMethod[]; futureRails: PaymentMethod[]} {
  const other = period === 'currentRails' ? 'futureRails' : 'currentRails'
  const selected = plan[period] ?? []
  return {
    currentRails: plan.currentRails ?? [], futureRails: plan.futureRails ?? [],
    [period]: selected.includes(rail) ? selected.filter(r => r !== rail) : [...selected, rail],
    [other]: (plan[other] ?? []).filter(r => r !== rail),
  }
}

export function stackIntegration(provider: Provider, stack: TechStack): {kind: 'native' | 'rest' | 'unknown'; label: string; source?: string} {
  if (stack !== 'other' && provider.stacks?.includes(stack)) {
    return {kind:'native', label: stack === 'kotlin' ? 'SDK Android / Kotlin officiel documenté' : 'Intégration publiée pour '+stackLabels[stack], source:provider.stackSources?.[stack]??provider.source}
  }
  if (stack !== 'noCode' && provider.restSource) {
    return {kind:'rest', label:stack === 'kotlin' ? 'API REST via ton backend pour Android' : 'API REST utilisable depuis ton backend '+(stack === 'other' ? '' : stackLabels[stack]), source:provider.restSource}
  }
  return {kind:'unknown', label:'Intégration avec ta stack non vérifiée'}
}

export function collectionFeeForRail(provider: Provider, rail: PaymentMethod): Fee | undefined {
  return rail === 'mobile' ? provider.fee : provider.fees?.[rail]
}

/** A recommendation only enters the documented shortlist if the selected rail,
 * operation and (when requested) sandbox/individual onboarding path are actually
 * evidenced. Missing metadata means investigation, NOT incompatibility.
 */
export function rankProviders(profile: FinderProfile, simulation?: PaymentSimulation | null): Candidate[] {
  const need = profile.need ?? 'collect'
  const costOrder = (a:Provider,b:Provider) => {
    if (profile.priority !== 'cost') return 0
    if (simulation) {
      const aTotal=simulateCollection(a,simulation).total
      const bTotal=simulateCollection(b,simulation).total
      if (aTotal === null && bTotal === null) return 0
      if (aTotal === null) return 1
      if (bTotal === null) return -1
      return aTotal-bTotal
    }
    return Number(currentPaymentMethods(profile).every(r => !!collectionFeeForRail(b,r))) -
      Number(currentPaymentMethods(profile).every(r => !!collectionFeeForRail(a,r)))
  }
  return providers.map((provider): Candidate => {
    let score = 0
    const known: string[] = []
    const unknown: string[] = []
    const evidence: Candidate['evidence'] = []

    const currentRails = currentPaymentMethods(profile)
    const railMatch = currentRails.every(rail => provider.rails?.includes(rail))
    if (railMatch) {
      score += 10
      known.push('Moyen de paiement annoncé dans la documentation')
      if(provider.source)evidence.push({label:'Moyen de paiement',url:provider.source})
    } else unknown.push('Moyen de paiement recherché non vérifié')

    // An advertised collection method is evidence of collection, never payout,
    // automated subscriptions, splitting or bulk disbursement.
    const needSource = need==='collect' && railMatch && provider.category!=='orchestrator'
      ? provider.source
      : need==='collect' ? undefined : provider.capabilities?.[need]
    const needMatch = Boolean(needSource)
    if(needMatch) {
      score+=22
      known.push(needLabels[need]+' : documentation disponible')
      evidence.push({label:needLabels[need],url:needSource!})
    } else unknown.push(needLabels[need]+' : capacité non vérifiée')

    const integration = stackIntegration(provider, profile.stack)
    if (integration.kind !== 'unknown') {
      score += integration.kind === 'native' ? 4 : 2
      known.push(integration.label)
      if (integration.source) evidence.push({label:'Intégration technique',url:integration.source})
    } else unknown.push(integration.label)

    if (provider.useCases?.includes(profile.useCase)) {
      score += 2
      known.push('Cas d’usage cité dans le relevé')
    } else unknown.push('Prise en charge du cas d’usage à vérifier')

    let stageMatch = true
    if (profile.stage === 'mvp') {
      stageMatch=Boolean(provider.sandbox)
      if(stageMatch){score+=12;known.push('Sandbox annoncée')}
      else unknown.push('Sandbox accessible non vérifiée')
    } else if (profile.stage === 'individual') {
      stageMatch=Boolean(provider.individualPathSource)
      if(stageMatch) {
        score+=15
        known.push('Parcours de vérification individuel décrit (approbation non garantie)')
        evidence.push({label:'KYC individuel',url:provider.individualPathSource!})
      } else unknown.push('Éligibilité sans société non vérifiée')
    } else {
      if(provider.businessKycSource) {
        score+=5
        known.push('Dossier KYC entreprise décrit')
        evidence.push({label:'KYC entreprise',url:provider.businessKycSource})
      } else unknown.push('Conditions KYC entreprise à confirmer')
    }

    if (profile.priority === 'integration' && provider.sandbox) score += 2
    if (profile.priority === 'coverage' && (provider.rails?.length ?? 0) > 1) score += 2
    if (profile.priority === 'cost') {
      if(currentRails.every(rail => collectionFeeForRail(provider,rail))) {
        // Cost is secondary to documented core capabilities and eligibility.
        score+=2
      } else unknown.push('Coût de collecte comparable non documenté')
    }
    if(profile.priority==='support')unknown.push('Qualité du SAV non mesurée')

    return {provider,score,tier:railMatch && needMatch && stageMatch?'documented':'investigate',known,unknown,evidence}
  }).sort((a,b)=>
    Number(b.tier==='documented')-Number(a.tier==='documented') ||
    costOrder(a.provider,b.provider) ||
    b.score-a.score || b.known.length-a.known.length ||
    a.provider.name.localeCompare(b.provider.name,'fr')
  )
}

export function collectionFeeEstimate(provider: Provider, count: number, amountXaf: number, rail: PaymentMethod = 'mobile'): number | null {
  const fee = collectionFeeForRail(provider,rail)
  if (!fee || !Number.isSafeInteger(count) || count < 0 || !Number.isFinite(amountXaf) || amountXaf < 0) return null
  const estimate = Math.round(count * (amountXaf * fee.percent / 100 + (fee.perTransactionXaf ?? 0)))
  return Number.isSafeInteger(estimate) ? estimate : null
}

export type SimulationChannel = {rail: PaymentMethod; count: number; amountXaf: number}
export type PaymentSimulation = {channels: SimulationChannel[]}

export function simulateCollection(provider: Provider, simulation: PaymentSimulation) {
  const lines = simulation.channels.map(channel => ({
    ...channel, fee:collectionFeeForRail(provider,channel.rail),
    estimate:collectionFeeEstimate(provider,channel.count,channel.amountXaf,channel.rail),
  }))
  const complete = lines.length > 0 && lines.every(line => line.estimate !== null)
  return {lines, complete, total:complete ? lines.reduce((sum,line) => sum + line.estimate!,0) : null}
}
