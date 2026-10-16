/**
 * Editorial snapshot, 16 October 2026. A lead in this inventory is NOT an
 * active, licensed provider. Only explicitly documented characteristics are
 * marked as known. Unknown is never treated as "no" or as a zero-fee quote.
 *
 * Keep this module side-effect-free so comparison rules can be unit-tested.
 */
export type UseCase = 'saas' | 'commerce' | 'marketplace' | 'freelance' | 'agency'
export type PaymentRail = 'mobile' | 'cards' | 'international'
export type TechStack = 'python' | 'node' | 'php' | 'mobile' | 'other'
export type BusinessStage = 'mvp' | 'individual' | 'company'
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
  useCases?: UseCase[]
  sandbox?: boolean
  /** Explicit published individual/unregistered onboarding path, not approval. */
  individualPath?: boolean
  fee?: Fee
}
export type FinderProfile = {
  useCase: UseCase
  rail: PaymentRail
  stack: TechStack
  stage: BusinessStage
  priority: Priority
}

const list: Provider[] = [
  // A — Gateways and merchant collection products (48)
  { id:'fapshi', name:'Fapshi', category:'gateway', source:'https://www.fapshi.com/en', rails:['mobile'], stacks:['python','node','php','other'], useCases:['saas','commerce'], sandbox:true, individualPath:true, fee:{ percent:3, source:'https://www.fapshi.com/fr/nos-tarifs'} },
  { id:'mesomb', name:'MeSomb', category:'gateway', source:'https://docs.mesomb.com/', rails:['mobile'], stacks:['python','node','php','mobile'], useCases:['saas','commerce','agency'], sandbox:true },
  { id:'notch-pay', name:'Notch Pay', category:'gateway', source:'https://www.notchpay.co/pricing', rails:['mobile','cards'], stacks:['php','node'], useCases:['commerce','saas'], fee:{percent:2,source:'https://www.notchpay.co/pricing'} },
  { id:'monetbil', name:'Monetbil', category:'gateway', source:'https://www.monetbil.com', rails:['mobile'], useCases:['commerce'] },
  { id:'payunit', name:'PayUnit', category:'gateway', source:'https://developer.payunit.net/', rails:['mobile','cards'], stacks:['python','node','php','mobile'], useCases:['commerce','saas'], sandbox:true },
  { id:'flutterwave', name:'Flutterwave', category:'gateway', source:'https://www.flutterwave.com', useCases:['commerce'] },
  { id:'campay', name:'CamPay', category:'gateway', source:'https://www.campay.net/fr/', rails:['mobile'], stacks:['python','node','other'], useCases:['commerce','saas'], fee:{percent:2,source:'https://www.campay.net/fr/'} },
  { id:'cinetpay', name:'CinetPay', category:'gateway', source:'https://docs.cinetpay.com/', rails:['mobile','cards'], useCases:['commerce','saas'] },
  { id:'mmgate', name:'MMGate', category:'gateway', source:'https://www.mmgate.org' },
  { id:'dropme', name:'Dropme', category:'gateway', source:'https://dropme.cm/fr/developers', rails:['mobile'], stacks:['python','node','other'] },
  { id:'zopay', name:'ZoPay', category:'gateway', source:'https://zopay.co/docs/getting-started/introduction' },
  { id:'my-coolpay', name:'My-CoolPay', category:'gateway', source:'https://my-coolpay.com/fr/api/tarifs', rails:['mobile','cards'], stacks:['php'], useCases:['commerce'], fee:{percent:1.8,annualXaf:10000,source:'https://my-coolpay.com/fr/api/tarifs'} },
  { id:'dohone', name:'Dohone', category:'gateway', source:'https://www.my-dohone.com' },
  { id:'elyonpay', name:'ElyonPay', category:'gateway', source:'https://docs.elyonpay.com/fr/', rails:['mobile','cards'], stacks:['python','node','mobile'], useCases:['saas','commerce'], sandbox:true },
  { id:'getmipay', name:'GetMiPay', category:'gateway', source:'https://getmipay.com/developers' },
  { id:'walleopay', name:'WalleoPay', category:'gateway', source:'https://walleopay.com', rails:['mobile'] },
  { id:'nokash', name:'NOKASH', category:'gateway', source:'https://nokash.co' },
  { id:'kola', name:'Kola', category:'gateway', source:'https://bikusgroup.com/realisations/kola' },
  { id:'ktcpay', name:'KTCPay', category:'gateway', source:'https://ktcpay.net' },
  { id:'paynote', name:'Paynote / Y-Note', category:'gateway', source:'https://www.paynote.africa/documentation-paynote.html', rails:['mobile'], useCases:['saas'] },
  { id:'tranzak', name:'Tranzak Cameroon', category:'gateway', source:'https://docs.developer.tranzak.me/', rails:['mobile'], useCases:['agency','saas'] },
  { id:'bui', name:'BUI Corporation', category:'gateway', source:'https://docs.buicorporation.io/', rails:['mobile'], stacks:['python','node','other'], useCases:['saas'] },
  { id:'sp-heavy', name:'SP-Heavy', category:'gateway', source:'https://www.yukwaindustries.org/' },
  { id:'camerpay', name:'CamerPay', category:'gateway', source:'https://camerpay.biz', useCases:['commerce'] },
  { id:'nexpay', name:'Nexpay', category:'gateway', source:'https://pay.nexbyt.com' },
  { id:'paymooney', name:'Paymooney', category:'gateway', source:'https://api-doc.paymooney.com/' },
  { id:'nelsiuspay', name:'NelsiusPay', category:'gateway', source:'https://nelsiuspay.com/fr', useCases:['marketplace'] },
  { id:'afrigate', name:'AfriGate', category:'gateway', source:'https://www.afrigate.co/fr/' },
  { id:'intasend', name:'IntaSend', category:'gateway', source:'https://developers.intasend.com/countries/cameroon/' },
  { id:'kkiapay', name:'KKiaPay', category:'gateway', source:'https://kkiapay.me' },
  { id:'digitalispay', name:'DigitalisPay', category:'gateway' },
  { id:'zitopay', name:'ZITOPAY', category:'gateway', source:'https://zitopay.africa/docs', rails:['mobile','cards'], stacks:['php','node','other'], useCases:['commerce','saas'], individualPath:true, fee:{percent:2.6,perTransactionXaf:10,source:'https://zitopay.africa/pricing'} },
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
  { id:'suprapay', name:'SupraPay', category:'adjacent', source:'https://www.suprapay.io/', useCases:['freelance'] },
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
  mobile:'MTN / Orange Money', cards:'Cartes bancaires', international:'Paiements internationaux',
}
export const stackLabels: Record<TechStack, string> = {
  python:'Python / Django / FastAPI', node:'Node.js / TypeScript', php:'PHP / WordPress',
  mobile:'Flutter / application mobile', other:'Autre / REST / no-code',
}
export const useCaseLabels: Record<UseCase, string> = {
  saas:'Un SaaS', commerce:'Une boutique e-commerce', marketplace:'Une marketplace',
  freelance:'Une activité freelance', agency:'Des projets pour mes clients',
}
export const stageLabels: Record<BusinessStage, string> = {
  mvp:'Un MVP en cours de test', individual:'Je vends sans société enregistrée',
  company:'Une entreprise enregistrée',
}
export const priorityLabels: Record<Priority, string> = {
  cost:'Les frais', integration:'Intégrer rapidement', support:'Le support et la fiabilité',
  coverage:'La diversité des paiements',
}

export type Candidate = {
  provider: Provider
  score: number
  known: string[]
  unknown: string[]
}

export function rankProviders(profile: FinderProfile): Candidate[] {
  return providers.map((provider) => {
    let score = 0
    const known: string[] = []
    const unknown: string[] = []

    if (provider.rails?.includes(profile.rail)) {
      score += 5
      known.push('Moyen de paiement documenté')
    } else unknown.push('Couverture du moyen de paiement')

    if (profile.stack === 'other') {
      if (provider.source && provider.stacks?.includes('other')) { score += 2; known.push('API REST documentée') }
      else unknown.push('Compatibilité technique')
    } else if (provider.stacks?.includes(profile.stack)) {
      score += 3
      known.push('Intégration technique documentée')
    } else unknown.push('Intégration avec ta stack')

    if (provider.useCases?.includes(profile.useCase)) {
      score += 2
      known.push("Cas d'usage pertinent d'après l'offre")
    } else unknown.push("Conditions pour ce cas d'usage")

    if (profile.stage === 'mvp') {
      if (provider.sandbox) { score += 2; known.push('Sandbox documentée') }
      else unknown.push('Accès à une sandbox')
    } else if (profile.stage === 'individual') {
      if (provider.individualPath) { score += 2; known.push('Parcours KYC individuel annoncé') }
      else unknown.push('Éligibilité sans société')
    }

    if (profile.priority === 'integration' && provider.sandbox) score += 1
    if (profile.priority === 'coverage' && (provider.rails?.length ?? 0) > 1) score += 1
    // A cheaper advertised rate earns only a small tie-breaker; missing fees never mean zero.
    if (profile.priority === 'cost' && provider.fee) score += Math.max(0, 3 - provider.fee.percent)
    if (profile.priority === 'support') unknown.push('Performance SAV non mesurée')

    return {provider,score,known,unknown}
  }).sort((a,b)=>b.score-a.score || b.known.length-a.known.length || a.provider.name.localeCompare(b.provider.name))
}

export function collectionFeeEstimate(provider: Provider, count: number, amountXaf: number): number | null {
  if (!provider.fee || !Number.isSafeInteger(count) || count < 0 || !Number.isFinite(amountXaf) || amountXaf < 0) return null
  return Math.round(count * (amountXaf * provider.fee.percent / 100 + (provider.fee.perTransactionXaf ?? 0)))
}
