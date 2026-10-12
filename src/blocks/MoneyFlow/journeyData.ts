/**
 * Trigenys Insight: Cameroon money-journey research snapshot, October 2026.
 *
 * Links describe provider-announced pathways, NOT real-time acceptance,
 * fees, service continuity, eligibility, or an endorsement.
 * Do not represent "not assessed" as "unavailable" or as zero cost.
 */
export const journeySources = {
  remitly: {
    label: 'Remitly — France → Cameroun',
    href: 'https://www.remitly.com/fr/fr/money-transfer/send-money-to-cameroon',
  },
  orangeSchool: {
    label: 'Orange Money — scolarité',
    href: 'https://orangemoney.orange.cm/fr/paiement-frais-de-scolarite-/paiement-frais-de-scolarite-minesec.html',
  },
  orangeMerchant: {
    label: 'Orange Money — paiement marchand',
    href: 'https://orangemoney.orange.cm/fr/om-paiement/flash-pay.html',
  },
  mtnSchool: {
    label: 'MTN MoMo — scolarité et commerçants',
    href: 'https://mtn.cm/fr/momo-soukoul/',
  },
  orangePricing: {
    label: 'Orange Money — tarifs',
    href: 'https://orangemoney.orange.cm/fr/tarification-orange-money.html',
  },
} as const

export type JourneySource = keyof typeof journeySources
export type Origin = 'france' | 'cameroon'
export type Wallet = 'orange' | 'mtn' | 'bank' | 'cash'
export type Goal = 'school' | 'shopping' | 'international' | 'crypto'
export type EvidenceStatus = 'documented' | 'conditional' | 'unknown'

export const originChoices: Origin[] = ['france', 'cameroon']
export const walletChoices: Wallet[] = ['orange', 'mtn', 'bank', 'cash']
export const goalChoices: Goal[] = ['school', 'shopping', 'international', 'crypto']

export type JourneyStage = {
  status: EvidenceStatus
  note: { fr: string; en: string }
  sources: JourneySource[]
}

export type JourneyResult = {
  incoming: JourneyStage
  outgoing: JourneyStage
  overall: EvidenceStatus
}

const documented = (fr: string, en: string, ...sources: JourneySource[]): JourneyStage => ({
  status: 'documented',
  note: { fr, en },
  sources,
})
const conditional = (fr: string, en: string, ...sources: JourneySource[]): JourneyStage => ({
  status: 'conditional',
  note: { fr, en },
  sources,
})
const unknown = (fr: string, en: string): JourneyStage => ({
  status: 'unknown',
  note: { fr, en },
  sources: [],
})

export function resolveJourney(origin: Origin, wallet: Wallet, goal: Goal): JourneyResult {
  let incoming: JourneyStage
  if (origin === 'france') {
    const method = wallet === 'cash'
      ? 'un retrait en espèces'
      : wallet === 'bank'
        ? 'un compte bancaire'
        : wallet === 'orange' ? 'Orange Money' : 'MTN MoMo'
    incoming = documented(
      `Remitly annonce des transferts France → Cameroun vers ${method}. Le prestataire, le montant et l'éligibilité doivent être confirmés au moment de l'envoi.`,
      `Remitly lists France → Cameroon transfers using ${wallet === 'cash' ? 'cash pickup' : wallet === 'bank' ? 'bank deposit' : wallet === 'orange' ? 'Orange Money' : 'MTN MoMo'}. Confirm provider, amount and eligibility before sending.`,
      'remitly',
    )
  } else if (wallet === 'orange') {
    incoming = documented(
      'Un compte Orange Money peut être alimenté localement auprès du réseau d’agents. L’identification et les limites du compte s’appliquent.',
      'An Orange Money wallet can be funded through local agents. Identification and wallet limits apply.',
      'orangePricing',
    )
  } else if (wallet === 'mtn') {
    incoming = conditional(
      'Le dépôt local sur MoMo dépend du compte, des agents et des conditions MTN à vérifier avant toute opération.',
      'Local MoMo cash-in depends on account, agents and applicable MTN conditions; confirm before using.',
      'mtnSchool',
    )
  } else if (wallet === 'bank') {
    incoming = conditional(
      'Un dépôt ou virement bancaire dépend de la banque, des justificatifs et de la formule du compte.',
      'A bank deposit or transfer depends on the bank, required documentation and account terms.',
    )
  } else {
    incoming = conditional(
      'Les espèces circulent hors portefeuille numérique ; choisir un guichet ou un prestataire réel et vérifier les justificatifs.',
      'Cash remains outside a digital wallet; confirm the actual counter/provider and receipts.',
    )
  }

  let outgoing: JourneyStage
  if (goal === 'crypto') {
    outgoing = unknown(
      'Parcours volontairement non validé. Ni Orange Money, ni MoMo, ni une plateforme P2P ne garantissent une conversion licite ou sûre. Vérifier les règles BEAC/COBAC/COSUMAF avant toute démarche.',
      'Not verified. Neither a mobile wallet nor a P2P marketplace guarantees lawful or safe crypto conversion. Verify BEAC/COBAC/COSUMAF rules before acting.',
    )
  } else if (goal === 'international') {
    outgoing = unknown(
      'Ce parcours vers un destinataire étranger n’est pas documenté pour cette combinaison. Les règles de change, les pays couverts, les intermédiaires et les frais doivent être vérifiés.',
      'No verified outward international route for this combination. Check foreign-exchange rules, supported countries, intermediaries and total fees.',
    )
  } else if (goal === 'school') {
    outgoing = wallet === 'orange'
      ? documented(
          'Orange Money documente le paiement des frais scolaires et examens dans les établissements partenaires, notamment sans Internet par USSD (#150*41#). Matricule, éligibilité et frais à confirmer.',
          'Orange Money documents school-fee payments at participating institutions, including via USSD (#150*41#) without internet. Confirm school, student ID and charges.',
          'orangeSchool',
        )
      : wallet === 'mtn'
        ? documented(
            'MTN documente le paiement de frais scolaires via MoMo, notamment *126*007# pour les services éligibles. Vérifier l’école et le montant.',
            'MTN documents MoMo school-fee payments, including *126*007# for eligible services. Verify school and amount.',
            'mtnSchool',
          )
        : conditional(
            'Le paiement d’école dépend de l’établissement : guichet, virement ou intermédiaire agréé. Le canal n’est pas universel.',
            'School payment depends on the institution: counter, bank transfer or accepted intermediary. No universal route is established.',
          )
  } else {
    outgoing = wallet === 'orange'
      ? documented(
          'Orange Money permet des paiements marchands, par code ou QR, et présente un parcours USSD (#150*47#) pour téléphone simple. Le commerce doit accepter ce service.',
          'Orange Money supports merchant codes, QR and USSD (#150*47#) on basic phones. The merchant must accept the service.',
          'orangeMerchant',
        )
      : wallet === 'mtn'
        ? documented(
            'MTN documente le paiement chez les commerçants via MoMoPay, y compris par code USSD. Le vendeur doit accepter MoMo.',
            'MTN documents MoMoPay merchant payments, including USSD. The seller must accept MoMo.',
            'mtnSchool',
          )
        : conditional(
            wallet === 'cash'
              ? 'Régler en espèces reste possible chez les commerçants qui les acceptent. Garder une preuve de paiement si nécessaire.'
              : 'Le paiement par carte ou virement bancaire dépend des moyens acceptés par le commerçant.',
            wallet === 'cash'
              ? 'Cash is accepted by merchants that take cash. Request a receipt where appropriate.'
              : 'Card/bank payments depend on the merchant’s accepted methods.',
          )
  }

  const rank: Record<EvidenceStatus, number> = { documented: 2, conditional: 1, unknown: 0 }
  const overall = rank[incoming.status] < rank[outgoing.status] ? incoming.status : outgoing.status
  return { incoming, outgoing, overall }
}

export const journeyCopy = {
  fr: {
    stages: ['Origine', 'Réception au Cameroun', 'Je veux ensuite…'],
    origins: { france: 'France', cameroon: 'Cameroun' },
    wallets: { orange: 'Orange Money', mtn: 'MTN MoMo', bank: 'Banque', cash: 'Espèces' },
    goals: { school: 'Payer la scolarité', shopping: 'Payer mes courses', international: 'Envoyer à l’étranger', crypto: 'Acheter de la crypto' },
    status: { documented: 'Offre documentée', conditional: 'Selon conditions', unknown: 'Parcours non vérifié' },
    title: 'Votre trajet, étape par étape',
    intro: 'Choisissez chaque étape. Les traits relient votre scénario ; ils ne représentent ni le volume des paiements ni une garantie de disponibilité.',
    step1: '1. Recevoir l’argent',
    step2: '2. L’utiliser',
    sources: 'Sources officielles',
    footnote: 'Informations déclarées par les prestataires, consultées en octobre 2026. Pas de données temps réel ni de simulation de frais ; une offre annoncée n’est pas un paiement testé. Vérifiez les conditions actuelles avant toute opération.',
    reset: 'Réinitialiser le parcours',
  },
  en: {
    stages: ['Where it comes from', 'How it arrives in Cameroon', 'What I want to do'],
    origins: { france: 'France', cameroon: 'Cameroon' },
    wallets: { orange: 'Orange Money', mtn: 'MTN MoMo', bank: 'Bank account', cash: 'Cash' },
    goals: { school: 'Pay school fees', shopping: 'Pay at a shop', international: 'Send abroad', crypto: 'Buy crypto' },
    status: { documented: 'Provider documented', conditional: 'Conditions apply', unknown: 'Route not verified' },
    title: 'Your money journey, step by step',
    intro: 'Choose each stage. The lines trace your selected scenario; they do not depict transaction volumes or guarantee availability.',
    step1: '1. Receive the funds',
    step2: '2. Spend or transfer',
    sources: 'First-party sources',
    footnote: 'Provider statements checked in October 2026. No real-time data or fee simulation; a marketed service is not a tested transaction. Verify current conditions before acting.',
    reset: 'Reset journey',
  },
} as const
