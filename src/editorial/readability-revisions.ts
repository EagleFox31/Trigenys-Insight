import type { Post } from '@/payload-types'

import {
  cybastionArticleMetadata,
  cybastionArticleMetadataEn,
  cybastionArticleSource,
  cybastionArticleSourceEn,
} from '@/editorial/cybastion-data-center'
import {
  createEditorialLexicalDocument,
  editorialLaunchArticles,
} from '@/editorial/editorial-launch-pack'
import {
  founderDraftMetadata,
  founderDraftSource,
} from '@/endpoints/seed/trigenys-founder-draft'

export type EditorialLocale = 'fr' | 'en'

export type ReadabilityRevision = {
  slug: string
  readingTime?: number
  locales: Partial<
    Record<
      EditorialLocale,
      {
        title: string
        excerpt: string
        metaTitle: string
        metaDescription: string
        content: Post['content']
      }
    >
  >
}

type Replacement = [from: string, to: string]

function replaceFirst(source: string, from: string, to: string) {
  return source.includes(from) ? source.replace(from, to) : source
}

function replaceAllLiteral(source: string, from: string, to: string) {
  return source.split(from).join(to)
}

function applyReplacements(source: string, replacements: Replacement[]) {
  return replacements.reduce((current, [from, to]) => replaceFirst(current, from, to), source)
}

function reviseCemac(source: string, locale: EditorialLocale) {
  if (locale === 'fr') {
    let revised = applyReplacements(source, [
      [
        'Les opérations doivent être routées et compensées à travers l’infrastructure du GIMAC.',
        'En clair, le GIMAC sert de carrefour : il envoie le paiement vers le bon réseau, puis organise le règlement entre les institutions.',
      ],
      [
        '## Le QR Code ne crée pas l’interopérabilité. Il lui donne une interface visible.',
        '## Le QR Code rend l’interopérabilité visible',
      ],
      [
        'Un QR Code de paiement n’a de valeur régionale que si les systèmes capables de le lire savent ensuite identifier le bénéficiaire, authentifier le payeur, router l’ordre, vérifier les règles applicables, effectuer la compensation et restituer un statut fiable aux deux parties.',
        'Le QR n’est que la porte d’entrée. Derrière, les systèmes doivent reconnaître le bénéficiaire, vérifier le payeur, envoyer l’ordre vers le bon réseau, appliquer les règles communes et confirmer le résultat aux deux parties.',
      ],
      [
        '## La vraie bataille est l’acceptation marchande',
        '## Le vrai test : est-ce que les commerçants l’utiliseront ?',
      ],
      [
        'Un système de paiement peut être techniquement interopérable et rester marginal dans la vie quotidienne.',
        'Interopérable signifie ici que deux réseaux différents peuvent échanger un paiement sans obliger le client et le commerçant à utiliser le même fournisseur. Techniquement, c’est possible. Dans la vie quotidienne, cela ne suffit pas.',
      ],
      [
        'Un prestataire de paiement regarde sa marge, les commissions d’interchange ou de routage, les coûts de conformité, les frais de règlement et l’effort d’intégration.',
        'Un prestataire de paiement regarde surtout ce que chaque transaction lui coûte, ce qu’il gagne dessus, les obligations réglementaires et l’effort technique nécessaire pour se connecter.',
      ],
      [
        'La tarification est donc presque une couche du protocole.',
        'Le prix compte donc presque autant que la technologie.',
      ],
      [
        'Dans un système réellement interopérable, son point d’acceptation devient plus neutre.',
        'Dans un système réellement interopérable, un même point de paiement peut servir davantage de clients, quel que soit leur réseau.',
      ],
      [
        'Le GIMAC a annoncé en avril 2026 le renouvellement de sa certification PCI DSS v4.0.1 pour son infrastructure de paiement.',
        'Le GIMAC a annoncé en avril 2026 le renouvellement de sa certification PCI DSS v4.0.1, un standard de sécurité utilisé dans l’industrie des paiements.',
      ],
      [
        'Taux d’échec et de réversal.',
        'Taux d’échec et d’annulation après paiement.',
      ],
    ])

    revised = replaceAllLiteral(revised, 'enrôlés', 'inscrits')
    return revised
  }

  return applyReplacements(source, [
    [
      'Transactions are expected to be routed and cleared through GIMAC infrastructure.',
      'In plain terms, GIMAC acts like a junction: it sends the payment to the right network and then helps settle the money between institutions.',
    ],
    [
      '## The QR code does not create interoperability. It gives interoperability a visible interface.',
      '## The QR code makes interoperability visible',
    ],
    [
      'A regional payment QR code only works if the systems reading it can identify the beneficiary, authenticate the payer, route the instruction, apply the relevant rules, clear the transaction and return a reliable status to both parties.',
      'The QR code is only the front door. Behind it, systems still have to identify the beneficiary, verify the payer, send the instruction to the right network, apply common rules and confirm the result to both sides.',
    ],
    [
      '## The real battle is merchant acceptance',
      '## The real test: will merchants actually use it?',
    ],
    [
      'A payment system can be technically interoperable and still remain marginal in everyday life.',
      'Interoperable means different payment networks can exchange a transaction without forcing the customer and merchant to use the same provider. That can work technically and still remain marginal in everyday life.',
    ],
    [
      'A payment provider looks at margins, routing and processing fees, compliance costs, settlement economics and integration effort.',
      'A payment provider mainly looks at what each transaction costs, what it earns from it, the regulatory burden and the technical effort required to connect.',
    ],
    [
      'Pricing is therefore almost a protocol layer.',
      'Price therefore matters almost as much as the technology.',
    ],
    [
      "In a genuinely interoperable system, the merchant's acceptance point becomes more neutral.",
      'In a genuinely interoperable system, one payment point can serve more customers even when they use different networks.',
    ],
    [
      'GIMAC announced in April 2026 that it had renewed PCI DSS v4.0.1 certification for its payment infrastructure.',
      'GIMAC announced in April 2026 that it had renewed PCI DSS v4.0.1 certification, a widely used security standard for payment infrastructure.',
    ],
  ])
}

function revisePublicSystems(source: string, locale: EditorialLocale) {
  if (locale === 'fr') {
    return applyReplacements(source, [
      [
        '## L’interopérabilité n’est pas un gigantesque projet de remplacement',
        '## Interopérabilité : faire travailler des systèmes différents ensemble',
      ],
      [
        'Un État ne devient pas interopérable parce qu’il achète une plateforme centrale plus grosse que toutes les autres.',
        'Un État ne devient pas interopérable simplement parce qu’il achète une grande plateforme centrale. L’objectif est plus simple à formuler : des systèmes différents doivent pouvoir échanger des informations de façon prévisible et sécurisée.',
      ],
      [
        'L’interopérabilité est donc moins une fusion qu’un contrat.',
        'En pratique, il ne faut pas fusionner tous les logiciels. Il faut définir un contrat commun : quelles données peuvent circuler, dans quel format, entre quels acteurs et sous quelles règles.',
      ],
      [
        'La contribution camerounaise à l’UIT propose une architecture de référence en cinq couches : connectivité et accès, services numériques, interopérabilité, données de référence, confiance et sécurité.',
        'La contribution camerounaise à l’UIT propose cinq couches. On peut les lire simplement ainsi : connecter les systèmes, fournir les services, organiser les échanges, savoir quelles données font référence, puis sécuriser l’ensemble.',
      ],
      [
        'La vraie question est : quelle source est autoritative ?',
        'La vraie question est : quelle base est la source officielle de référence ?',
      ],
      [
        'Une architecture interopérable doit savoir quelles bases font référence pour chaque type d’information, puis rendre cette donnée réutilisable selon des règles claires.',
        'Le système doit donc savoir quelle administration fait foi pour chaque information, puis autoriser les autres services à réutiliser cette donnée selon des règles claires.',
      ],
      [
        '## Une API Gateway ne suffit pas',
        '## Une porte d’entrée API ne règle pas tout',
      ],
      [
        'Dans les projets d’intégration, il est tentant de considérer qu’un bus d’entreprise, une API Gateway ou une plateforme d’échange résout le problème.',
        'Dans un projet d’intégration, on peut être tenté de croire qu’une API Gateway — une porte d’entrée qui contrôle les échanges entre applications — suffit à résoudre le problème.',
      ],
      [
        'L’interopérabilité demande donc des contrats de données, des schémas documentés, du versionnement, des conventions d’erreur, des règles de compatibilité, des journaux d’audit et des responsabilités de maintenance.',
        'Il faut aussi documenter le format des données, versionner les changements, définir les erreurs possibles, garder une trace des échanges et savoir qui maintient quoi.',
      ],
      [
        'Qui annonce une évolution de schéma ?',
        'Qui prévient les autres lorsqu’un format de données change ?',
      ],
      [
        '## Le Cameroun n’a pas besoin que tous ses systèmes deviennent identiques. Il a besoin qu’ils deviennent compatibles.',
        '## Les systèmes publics n’ont pas besoin d’être identiques. Ils doivent pouvoir travailler ensemble.',
      ],
    ])
  }

  return applyReplacements(source, [
    [
      '## Interoperability is not one enormous replacement project',
      '## Interoperability means making different systems work together',
    ],
    [
      'A government does not become interoperable because it buys one central platform larger than all the others.',
      'A government does not become interoperable simply by buying one large central platform. The practical goal is simpler: different systems need to exchange information predictably and securely.',
    ],
    [
      'Interoperability is therefore less a merger than a contract.',
      'In practice, the systems do not need to be merged. They need a shared contract: what data can move, in what format, between which institutions and under which rules.',
    ],
    [
      'The Cameroonian ITU contribution proposes a five-layer reference architecture: connectivity and access, digital services, interoperability, reference data, and trust and security.',
      'The Cameroonian ITU contribution proposes five layers. In plain language: connect the systems, deliver services, organise exchanges, decide which data is the official reference, and secure the whole chain.',
    ],
    [
      'Which source is authoritative?',
      'Which database is the official source of record?',
    ],
    [
      'An interoperable architecture needs to know which systems are authoritative for each type of information, then make that data reusable under clear rules.',
      'The architecture therefore needs to know which institution is the official source for each type of information, then let other services reuse that data under clear rules.',
    ],
    [
      '## An API gateway is not enough',
      '## An API gateway does not solve everything',
    ],
    [
      'Integration projects often treat an enterprise service bus, API gateway or data-exchange platform as the solution.',
      'Integration projects often treat an API gateway — a controlled front door between applications — or a data-exchange platform as the solution.',
    ],
    [
      'Interoperability therefore requires data contracts, documented schemas, versioning, error conventions, compatibility rules, audit logs and explicit maintenance responsibilities.',
      'It also requires documented data formats, versioned changes, clear error rules, compatibility checks, audit logs and named owners for maintenance.',
    ],
    [
      'Who announces a schema change?',
      'Who tells the other institutions when a data format changes?',
    ],
    [
      '## Cameroon does not need every public system to become identical. It needs them to become compatible.',
      '## Public systems do not need to be identical. They need to work together.',
    ],
  ])
}

function reviseFunding(source: string, locale: EditorialLocale) {
  if (locale === 'fr') {
    let revised = applyReplacements(source, [
      [
        'Selon Africa: The Big Deal, 31 startups africaines ont annoncé en août des financements d’au moins 100 000 dollars pour un total de 455 millions de dollars, hors exits.',
        'Selon Africa: The Big Deal, 31 startups africaines ont annoncé en août des financements d’au moins 100 000 dollars pour un total de 455 millions de dollars, hors rachats et introductions en Bourse.',
      ],
      [
        '## Un gros mois n’est pas automatiquement un marché profond',
        '## Un gros mois ne signifie pas que beaucoup de startups trouvent du financement',
      ],
      [
        'La profondeur d’un marché se voit aussi dans le nombre d’entreprises capables de lever.',
        'Pour savoir si le marché se porte vraiment mieux, il faut aussi regarder combien d’entreprises différentes réussissent à lever.',
      ],
      [
        'TechCabal Insights indique que le financement early-stage suivi dans son rapport H1 2026 a reculé à 9 millions de dollars contre 25 millions au premier semestre 2025.',
        'TechCabal Insights indique que le financement des startups aux stades les plus précoces a reculé à 9 millions de dollars au premier semestre 2026, contre 25 millions un an plus tôt dans son suivi.',
      ],
      [
        'Une startup au stade pré-seed ou seed doit encore prouver le produit, le marché, la distribution et parfois même la capacité du client à payer.',
        'Une startup tout au début — pré-seed ou seed — doit encore prouver que son produit intéresse réellement un marché, qu’elle sait trouver des clients et que ces clients paieront.',
      ],
      [
        'Dans une période où les investisseurs privilégient la preuve de revenus, la rentabilité unitaire et la visibilité sur les prochaines levées, ce risque initial devient plus difficile à financer.',
        'Quand les investisseurs demandent davantage de revenus, une économie rentable par client et une trajectoire claire vers la prochaine levée, financer ce tout premier risque devient plus difficile.',
      ],
      [
        'Africa: The Big Deal, avec une méthodologie différente, situait la répartition du premier semestre autour de deux tiers d’equity et un tiers de dette.',
        'Africa: The Big Deal, avec une méthodologie différente, estimait la répartition du premier semestre à environ deux tiers de financement en capital — de l’argent investi contre des parts de l’entreprise — et un tiers de dette.',
      ],
      [
        'Lorsque la dette augmente dans le mix global, la valeur totale des financements peut donc monter sans que les entreprises les plus jeunes bénéficient de la même amélioration.',
        'Lorsque la dette prend plus de place dans la répartition globale, le total levé peut donc augmenter sans que les startups les plus jeunes aient plus facilement accès à l’argent.',
      ],
      [
        'Et dans le venture, la continuité est parfois plus importante que l’abondance ponctuelle.',
        'Et dans le capital-risque, disposer de financeurs présents année après année compte parfois davantage qu’un mois exceptionnel.',
      ],
      [
        'Des exits capables de recycler du capital et de l’expérience.',
        'Des sorties — rachats ou introductions en Bourse — capables de remettre du capital et de l’expérience dans l’écosystème.',
      ],
    ])

    revised = replaceAllLiteral(revised, 'méga-deals', 'très grosses levées')
    return revised
  }

  let revised = applyReplacements(source, [
    [
      'According to Africa: The Big Deal, 31 African startups announced funding rounds of at least $100,000 in August, raising a combined $455 million excluding exits.',
      'According to Africa: The Big Deal, 31 African startups announced funding rounds of at least $100,000 in August, raising a combined $455 million, excluding acquisitions and public listings.',
    ],
    [
      '## A big month is not automatically a deep market',
      '## A big month does not mean many startups are getting funded',
    ],
    [
      'Market depth is also visible in the number of companies able to raise.',
      'To know whether the market is genuinely improving, you also have to count how many different companies are able to raise money.',
    ],
    [
      'TechCabal Insights says early-stage funding tracked in its H1 2026 report fell to $9 million from $25 million in H1 2025.',
      'TechCabal Insights says funding for the earliest-stage startups in its H1 2026 report fell to $9 million, from $25 million a year earlier.',
    ],
    [
      "A pre-seed or seed company still has to prove product, market, distribution and sometimes even the customer's ability to pay.",
      'A very young startup — at pre-seed or seed stage — still has to prove that people want the product, that it can reach customers and that those customers will pay.',
    ],
    [
      'When investors place more weight on revenue evidence, unit economics and visibility into the next funding round, that initial uncertainty becomes harder to finance.',
      'When investors demand more evidence of revenue, a profitable customer or transaction model, and a clear path to the next round, that early uncertainty becomes harder to finance.',
    ],
    [
      'Africa: The Big Deal, using a different methodology, put the first-half split at roughly two-thirds equity and one-third debt.',
      'Africa: The Big Deal, using a different methodology, put the first-half split at roughly two-thirds equity — money invested in exchange for ownership — and one-third debt.',
    ],
    [
      'So as debt grows within the funding mix, total capital can rise without producing the same improvement for the youngest startups.',
      'So as debt takes a larger share of funding, the headline total can rise even when the youngest startups are not finding it any easier to raise.',
    ],
    [
      'And in venture capital, continuity can matter more than occasional abundance.',
      'And in venture capital, having investors who remain active year after year can matter more than one exceptional month.',
    ],
    [
      'More exits capable of recycling money and experience.',
      'More exits — acquisitions or public listings — that recycle money and experience back into the ecosystem.',
    ],
  ])

  revised = replaceAllLiteral(revised, 'mega-deals', 'very large rounds')
  return revised
}

function reviseCybastion(source: string, locale: EditorialLocale) {
  if (locale === 'fr') {
    let revised = replaceAllLiteral(source, 'compute', 'puissance de calcul')
    revised = applyReplacements(revised, [
      [
        'À ce stade, plusieurs informations décisives ne sont pas publiques : capacité électrique du site, puissance informatique installée, nombre et type d’accélérateurs, densité des racks, technologie de refroidissement, calendrier détaillé, site exact à Douala ou encore structure de financement.',
        'À ce stade, plusieurs informations décisives ne sont pas publiques : puissance électrique disponible, capacité de calcul installée, type de GPU, refroidissement, calendrier, site exact à Douala et structure de financement.',
      ],
      [
        'Un data center absorbe du capital dans beaucoup plus que les serveurs que l’on voit sur les photos : bâtiment sécurisé, transformateurs, UPS, batteries, groupes ou production de secours, refroidissement, détection incendie, contrôle d’accès, stockage, réseau, fibre, supervision, pièces de rechange et maintenance.',
        'Un data center ne paie pas seulement des serveurs. Il faut aussi financer le bâtiment sécurisé, l’électricité de secours, le refroidissement, la fibre, le stockage, la surveillance, la sécurité physique et la maintenance.',
      ],
      [
        'Quels GPU seront réellement accessibles ? À quelle échelle ? Pour quels clients ? Sous quelle forme commerciale : colocation, cloud privé, GPU-as-a-Service, services managés ?',
        'Quels GPU seront réellement accessibles ? À quelle échelle ? Pour quels clients ? Et sous quelle forme : location d’espace dans le data center, cloud privé, location de puissance GPU à la demande ou services entièrement gérés ?',
      ],
      [
        'Avec des racks IA haute densité, cette contrainte grimpe rapidement.',
        'Avec des armoires remplies de serveurs IA très puissants, la consommation et la chaleur augmentent rapidement.',
      ],
      [
        'CAMTEL met notamment en avant son data center de Zamengoé, qu’il présente comme certifié Tier 3 et comme un élément de l’hébergement local des données.',
        'CAMTEL met notamment en avant son data center de Zamengoé, qu’il présente comme certifié Tier 3 — un niveau reconnu de disponibilité et de redondance — et comme un élément de l’hébergement local des données.',
      ],
      [
        '## Héberger des données et posséder du compute sont deux batailles différentes',
        '## Héberger les données ne suffit pas : il faut aussi pouvoir calculer localement',
      ],
      [
        'Aujourd’hui, une startup camerounaise peut utiliser une API d’IA hébergée aux États-Unis ou en Europe. Elle peut louer des GPU auprès d’un hyperscaler étranger. Une université peut également exécuter certains travaux dans un cloud international.',
        'Aujourd’hui, une startup camerounaise peut utiliser une API d’IA hébergée aux États-Unis ou en Europe. Elle peut louer des GPU auprès d’un grand fournisseur cloud étranger. Une université peut faire la même chose pour certains travaux.',
      ],
      [
        'Une institution pourrait conserver des charges sensibles dans une infrastructure nationale.',
        'Une institution pourrait conserver des applications et traitements sensibles dans une infrastructure nationale.',
      ],
      [
        'Ils compareront les prix, les certifications, les SLA, la qualité du support, la connectivité, les sauvegardes, les mécanismes de reprise après incident, les capacités de sécurité et la facilité d’intégration.',
        'Ils compareront les prix, les certifications, les engagements de disponibilité et de support (SLA), la connectivité, les sauvegardes, la reprise après incident, la sécurité et la facilité d’intégration.',
      ],
    ])
    return revised
  }

  let revised = replaceAllLiteral(source, 'compute', 'computing power')
  revised = applyReplacements(revised, [
    [
      "At this stage, several decisive details remain undisclosed: the site's electrical capacity, installed computing power capacity, the number and type of accelerators, rack density, cooling technology, detailed construction schedule, exact location in Douala and the project's financing structure.",
      "At this stage, several decisive details remain undisclosed: available electrical power, installed computing capacity, GPU type, cooling, construction schedule, exact location in Douala and the financing structure.",
    ],
    [
      'A data center consumes capital on far more than the servers visible in promotional photographs: a secure building, transformers, UPS systems, batteries, backup or dedicated generation, cooling, fire detection, access control, storage, networking, fiber connectivity, monitoring, spare parts and maintenance.',
      'A data center is not just a room full of servers. Money also goes into secure facilities, backup power, cooling, fiber, storage, monitoring, physical security and maintenance.',
    ],
    [
      'Which GPUs will actually be available? At what scale? For which customers? And under what commercial model — colocation, private cloud, GPU-as-a-Service or managed services?',
      'Which GPUs will actually be available? At what scale? For which customers? And how will they be sold: rented data-center space, private cloud, on-demand GPU access or fully managed services?',
    ],
    [
      'With high-density AI racks, that constraint rises quickly.',
      'When a rack is packed with powerful AI servers, electricity use and heat rise quickly.',
    ],
    [
      'CAMTEL notably promotes its Zamengoé data center, which it describes as Tier III certified and as part of the country’s local data-hosting infrastructure.',
      'CAMTEL notably promotes its Zamengoé data center, which it describes as Tier III certified — a recognised level of availability and redundancy — and as part of the country’s local data-hosting infrastructure.',
    ],
    [
      '## Hosting data and owning computing power are two different battles',
      '## Hosting data is not enough: local computing power matters too',
    ],
    [
      'Today, a Cameroonian startup can use an AI API hosted in the United States or Europe. It can rent GPUs from a foreign hyperscaler. A university can also run certain workloads in an international cloud.',
      'Today, a Cameroonian startup can use an AI API hosted in the United States or Europe. It can rent GPUs from a large foreign cloud provider. A university can do the same for some research workloads.',
    ],
    [
      'An institution could keep sensitive workloads in national infrastructure.',
      'An institution could keep sensitive applications and processing inside national infrastructure.',
    ],
    [
      'They will compare pricing, certifications, SLAs, support quality, connectivity, backups, disaster-recovery mechanisms, security capabilities and ease of integration.',
      'They will compare pricing, certifications, service-level commitments (SLAs), support, connectivity, backups, disaster recovery, security and ease of integration.',
    ],
  ])
  return revised
}

function reviseFounder(source: string) {
  return applyReplacements(source, [
    [
      'Je développe Trigenys avec une contrainte familière aux petites équipes : il faut tester vite, mais chaque service supplémentaire augmente le coût, la maintenance et la surface de panne.',
      'Je développe Trigenys avec une contrainte familière aux petites équipes : il faut tester vite, mais chaque service supplémentaire coûte de l’argent, demande de la maintenance et ajoute un nouveau point susceptible de tomber en panne.',
    ],
    [
      'Le prototype, baptisé Campaign OS, s’appuyait sur n8n pour l’orchestration, Gemini 2.5 Flash pour les tâches génératives, Gmail pour les validations et Claude via MCP pour accélérer la construction du workflow.',
      'Le prototype, baptisé Campaign OS, utilisait n8n pour coordonner les étapes, Gemini 2.5 Flash pour les tâches génératives, Gmail pour les validations et Claude via MCP — un protocole qui permet à un outil d’en piloter un autre — pour accélérer la construction du workflow.',
    ],
    [
      'Le nœud Wait permettait également de suspendre une exécution jusqu’à une validation reçue par webhook.',
      'Le nœud Wait permettait aussi de mettre une exécution en pause jusqu’à une validation reçue par webhook, c’est-à-dire via une URL appelée automatiquement par un autre service.',
    ],
    [
      'Autrement dit, le workflow n’a pas besoin d’occuper activement un worker pendant toute l’attente, mais sa reprise doit être traitée comme une partie critique du système.',
      'Autrement dit, le workflow n’a pas besoin de garder un processus serveur occupé pendant toute l’attente. En revanche, la reprise doit être traitée comme une partie critique du système.',
    ],
    [
      'J’ajouterais un jeu d’évaluation avant de changer les prompts ou les modèles.',
      'J’ajouterais un jeu d’évaluation — une série de cas tests avec des résultats attendus — avant de changer les prompts ou les modèles.',
    ],
    [
      'Je rendrais chaque reprise idempotente afin qu’un double clic ou un webhook rejoué ne déclenche pas deux campagnes.',
      'Je rendrais chaque reprise sans risque de doublon, ou idempotente : un double clic ou un webhook rejoué ne devrait jamais déclencher deux campagnes.',
    ],
    [
      'Je suivrais le coût et la durée par exécution. Je séparerais les secrets de la configuration fonctionnelle et je réduirais au minimum les données client envoyées aux fournisseurs de modèles.',
      'Je suivrais le coût et la durée de chaque exécution. Je séparerais les secrets de la configuration fonctionnelle et je limiterais au strict nécessaire les données client envoyées aux fournisseurs de modèles.',
    ],
    [
      'Le coût marginal d’une exécution était proche de zéro dans les conditions de l’essai. À l’échelle, il faut pourtant compter les tokens, les e-mails, le stockage, l’observabilité, les reprises après erreur, le temps de contrôle humain et le support.',
      'Le coût marginal d’une exécution était proche de zéro dans les conditions de l’essai. À l’échelle, il faut pourtant compter le volume de texte traité par les modèles (tokens), les e-mails, le stockage, le suivi des erreurs et performances, les reprises après erreur, le temps de contrôle humain et le support.',
    ],
  ])
}

function revisedExcerpt(slug: string, locale: EditorialLocale, fallback: string) {
  const excerpts: Record<string, Partial<Record<EditorialLocale, string>>> = {
    '42-milliards-fcfa-data-center-ia-douala-cameroun': {
      fr: "Cybastion annonce 75 millions de dollars pour un data center IA à Douala. Au-delà du montant, les questions concrètes sont simples : combien de puissance de calcul, à quel prix, avec quelle énergie et sous quel contrôle ?",
      en: "Cybastion plans a $75 million AI data center in Douala. Beyond the headline amount, the practical questions are simple: how much computing power, at what price, with what energy supply and under whose control?",
    },
    'cemac-qr-code-interoperable-paiements-adoption': {
      fr: "La CEMAC a lancé un QR Code commun pour permettre à des réseaux de paiement différents de fonctionner ensemble. Le vrai test sera beaucoup plus concret : prix, simplicité, sécurité et adoption par les commerçants.",
      en: "CEMAC has launched a common QR code so different payment networks can work together. The real test is much more practical: price, simplicity, security and whether merchants actually use it.",
    },
    'cameroun-systemes-publics-interoperabilite-architecture': {
      fr: "Le Cameroun veut que ses services publics numériques puissent échanger des informations sans tout reconstruire. Cela exige des règles communes pour l’identité, les données, les API, la sécurité et les responsabilités.",
      en: "Cameroon wants public digital services to exchange information without rebuilding everything. That requires shared rules for identity, data, APIs, security and accountability.",
    },
    'afrique-financement-startups-2026-reprise-inegale': {
      fr: "Les startups africaines ont levé 455 M$ en août 2026, mais plus de la moitié venait d’une seule opération. Pour comprendre la reprise, il faut regarder combien d’entreprises lèvent, à quel stade et avec quel type de financement.",
      en: "African startups raised $455M in August 2026, but more than half came from one deal. To understand the recovery, look at how many companies are raising, at which stage and with what type of funding.",
    },
    'pipeline-ia-multi-agents-quatre-heures': {
      fr: "En juin 2026, j’ai construit en quatre heures un prototype avec trois agents IA et deux validations humaines. Voici l’architecture, les sept problèmes rencontrés et les leçons utiles sans jargon inutile.",
    },
  }

  return excerpts[slug]?.[locale] || fallback
}

const launchRevisions = editorialLaunchArticles.map<ReadabilityRevision>((article) => {
  const revise =
    article.slug === 'cemac-qr-code-interoperable-paiements-adoption'
      ? reviseCemac
      : article.slug === 'cameroun-systemes-publics-interoperabilite-architecture'
        ? revisePublicSystems
        : reviseFunding

  return {
    slug: article.slug,
    readingTime: article.readingTime,
    locales: {
      fr: {
        title: article.fr.title,
        excerpt: revisedExcerpt(article.slug, 'fr', article.fr.excerpt),
        metaTitle: article.fr.metaTitle,
        metaDescription: revisedExcerpt(article.slug, 'fr', article.fr.metaDescription),
        content: createEditorialLexicalDocument(revise(article.fr.content, 'fr')),
      },
      en: {
        title: article.en.title,
        excerpt: revisedExcerpt(article.slug, 'en', article.en.excerpt),
        metaTitle: article.en.metaTitle,
        metaDescription: revisedExcerpt(article.slug, 'en', article.en.metaDescription),
        content: createEditorialLexicalDocument(revise(article.en.content, 'en')),
      },
    },
  }
})

export const readabilityRevisions: ReadabilityRevision[] = [
  {
    slug: cybastionArticleMetadata.slug,
    readingTime: cybastionArticleMetadata.readingTime,
    locales: {
      fr: {
        title: cybastionArticleMetadata.title,
        excerpt: revisedExcerpt(cybastionArticleMetadata.slug, 'fr', cybastionArticleMetadata.excerpt),
        metaTitle: cybastionArticleMetadata.metaTitle,
        metaDescription: revisedExcerpt(cybastionArticleMetadata.slug, 'fr', cybastionArticleMetadata.excerpt),
        content: createEditorialLexicalDocument(reviseCybastion(cybastionArticleSource, 'fr')),
      },
      en: {
        title: cybastionArticleMetadataEn.title,
        excerpt: revisedExcerpt(cybastionArticleMetadata.slug, 'en', cybastionArticleMetadataEn.excerpt),
        metaTitle: cybastionArticleMetadataEn.metaTitle,
        metaDescription: revisedExcerpt(
          cybastionArticleMetadata.slug,
          'en',
          cybastionArticleMetadataEn.metaDescription,
        ),
        content: createEditorialLexicalDocument(reviseCybastion(cybastionArticleSourceEn, 'en')),
      },
    },
  },
  ...launchRevisions,
  {
    slug: founderDraftMetadata.slug,
    readingTime: founderDraftMetadata.readingTime,
    locales: {
      fr: {
        title: founderDraftMetadata.title,
        excerpt: revisedExcerpt(founderDraftMetadata.slug, 'fr', founderDraftMetadata.excerpt),
        metaTitle: 'Pipeline IA multi-agents : architecture, bugs et leçons',
        metaDescription: revisedExcerpt(founderDraftMetadata.slug, 'fr', founderDraftMetadata.excerpt),
        content: createEditorialLexicalDocument(reviseFounder(founderDraftSource)),
      },
    },
  },
]
