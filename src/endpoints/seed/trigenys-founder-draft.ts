export const founderDraftSource = `## Ce que j’ai réellement construit

En juin 2026, je voulais vérifier une idée simple : pouvait-on transformer les premières étapes d’une campagne marketing — audit d’une boutique, compréhension de l’audience et formulation d’angles stratégiques — en un processus assisté par plusieurs agents IA, sans retirer les décisions importantes à l’humain ?

Quatre heures plus tard, un premier prototype fonctionnait. Il reliait trois agents spécialisés, deux validations humaines, un formulaire web et une orchestration n8n. Le coût facturé pendant cette session de prototypage était de 0 €. Ce chiffre décrit une expérience datée, réalisée avec les quotas disponibles sur mes comptes en juin 2026 ; ce n’est ni une promesse de gratuité permanente ni un modèle de coût universel.

Voici l’architecture, les sept problèmes qui ont réellement ralenti le travail et ce que je construirais différemment aujourd’hui.

## Le contexte : prototyper sous contrainte

Je développe Trigenys avec une contrainte familière aux petites équipes : il faut tester vite, mais chaque service supplémentaire augmente le coût, la maintenance et la surface de panne.

Je ne cherchais donc pas à fabriquer une démonstration spectaculaire. Je voulais un flux utilisable : une demande entre, l’analyse progresse par étapes, une personne peut accepter ou corriger les décisions sensibles, puis le résultat revient dans un format exploitable.

Le prototype, baptisé Campaign OS, s’appuyait sur n8n pour l’orchestration, Gemini 2.5 Flash pour les tâches génératives, Gmail pour les validations et Claude via MCP pour accélérer la construction du workflow.

Les offres et quotas des API évoluent. En septembre 2026, Google précise que les limites Gemini dépendent du modèle, du niveau d’usage et du projet, et qu’elles ne sont pas garanties. La bonne pratique n’est donc pas d’inscrire un quota fixe dans un business plan, mais de consulter les limites actives du projet et de mesurer le coût réel de chaque exécution.

## Trois agents, deux décisions humaines

Le premier agent, Auditor, recevait les données de la boutique et produisait un diagnostic structuré : positionnement apparent, qualité du message, friction dans le parcours et signaux de confiance.

Le deuxième, Cartographer, transformait ce diagnostic en hypothèses d’audience : segments, motivations, objections et contextes d’achat.

Le troisième, Strategist, proposait plusieurs angles de campagne à partir du diagnostic et de la cartographie.

Entre ces étapes, deux validations humaines empêchaient le système de poursuivre automatiquement sur une hypothèse faible. Une personne pouvait approuver, rejeter ou demander une correction. L’objectif n’était pas de placer un humain à la fin pour signer mécaniquement le résultat, mais de l’installer aux endroits où une mauvaise décision se propage dans tout le reste du pipeline.

## Pourquoi n8n plutôt qu’un backend sur mesure

Pour cette première version, n8n rendait visibles les dépendances, les embranchements et les données qui circulaient entre les étapes. Cette visibilité comptait davantage que l’élégance d’une architecture entièrement codée.

Le nœud Wait permettait également de suspendre une exécution jusqu’à une validation reçue par webhook. La documentation actuelle de n8n précise que les données d’une exécution en attente sont déchargées vers la base et que chaque exécution dispose d’une URL de reprise. Autrement dit, le workflow n’a pas besoin d’occuper activement un worker pendant toute l’attente, mais sa reprise doit être traitée comme une partie critique du système.

## Les sept problèmes qui ont réellement compté

### 1. Une API disponible n’est pas forcément immédiatement exploitable

Mon premier choix était d’utiliser l’API Anthropic. Dans le compte utilisé ce jour-là, l’accès souhaité nécessitait d’activer la facturation. Plutôt que de bloquer le prototype, j’ai basculé sur Gemini.

La leçon n’est pas qu’une API est « gratuite » et l’autre non. Les API génératives sont tarifées selon les modèles et les volumes, et les conditions d’accès changent. Il faut vérifier avant le développement la facturation, les limites du projet, les régions disponibles et le comportement attendu en cas de dépassement.

### 2. Un refus Shopify n’est pas un problème à contourner

L’audit d’une boutique cliente rencontrait des réponses 403. Mon premier réflexe a été de chercher comment rendre les requêtes acceptables. Le bon cadrage est plus strict : identifier proprement l’agent et obtenir une autorisation adaptée.

Depuis mai 2026, Shopify applique des limites plus sévères aux bots et agents qui accèdent aux pages hébergées et recommande Web Bot Auth pour signer les requêtes. Les marchands qui explorent leurs propres boutiques peuvent récupérer des signatures prêtes à l’emploi depuis leur administration Shopify.

Dans un produit destiné à plusieurs clients, je ne présenterais donc jamais cette étape comme un contournement de protection. J’en ferais un flux explicite de consentement, avec une signature liée au bon domaine et une solution de repli si l’accès n’est pas autorisé.

### 3. Le domaine exact fait partie de l’identité signée

Lors des essais, une signature préparée pour le domaine nu ne fonctionnait pas lorsque la requête partait vers la variante en www. Ce détail paraît minuscule ; dans un mécanisme de signature HTTP, il ne l’est pas.

Il faut normaliser l’URL dès l’entrée, suivre les redirections de manière contrôlée et signer exactement l’autorité réellement appelée. Une différence de sous-domaine ne doit jamais être corrigée au hasard au milieu du workflow.

### 4. Un objet JSON valide peut être une très mauvaise interface

Les premières demandes de validation arrivaient par e-mail sous forme de JSON brut. Les données étaient complètes, mais la décision humaine devenait inutilement pénible.

J’ai remplacé ce rendu par une synthèse lisible : titres, constats prioritaires, risques, recommandations et boutons de décision. Ce changement n’améliorait pas le modèle. Il améliorait le système, parce qu’une validation rapide dépend autant de la présentation que de la qualité de l’analyse.

### 5. Concaténer une URL à la main finit par casser

J’ajoutais initialement « ?approved=true » à l’URL de reprise. Certaines URLs comportaient déjà une chaîne de requête : il fallait alors utiliser « & », pas un second « ? ».

La correction durable consiste à utiliser URL et URLSearchParams, puis à tester les cas avec paramètres existants, encodage et redirections. Une URL est une structure de données, pas une chaîne à assembler par intuition.

### 6. Les URLs de reprise sont des données d’exécution

Dans n8n, l’URL exposée par \$execution.resumeUrl est générée pour l’exécution en cours. La documentation avertit aussi que les exécutions partielles peuvent produire une nouvelle URL de reprise.

Je traite donc désormais cette URL comme un jeton éphémère : elle doit être transmise au bon destinataire, ne pas apparaître dans les logs publics, expirer avec l’exécution et ne jamais être copiée depuis un ancien test.

### 7. Les instructions stables et les données variables ne jouent pas le même rôle

Au début, je mélangeais la mission de l’agent, les règles de sortie et les données du client dans un même message utilisateur. Le résultat fonctionnait, mais devenait difficile à évaluer et à faire évoluer.

J’ai séparé les instructions stables — rôle, contraintes, structure attendue — des entrées propres à chaque exécution. Cette séparation facilite les tests, les changements de modèle et la comparaison des résultats.

## Le résultat observé

Sur le prototype, une analyse complète prenait environ cinq à dix minutes, temps de validation humaine compris. Ce résultat ne constitue pas encore un benchmark : il provient d’un petit nombre d’essais, sans charge concurrente ni jeu d’évaluation formel.

La vraie victoire n’était pas la vitesse brute. C’était la traçabilité. Chaque étape recevait une entrée identifiable, produisait une sortie structurée et attendait une décision lorsque l’incertitude pouvait modifier la suite.

## Ce que l’expérience change économiquement

Ce prototype rend plausible une offre d’audit et de préparation de campagne plus rapide, mais il ne suffit pas à prouver un prix, une marge ou une demande. Les montants envisagés au départ — de l’audit ponctuel à l’accompagnement complet — restent des hypothèses commerciales à tester auprès de vrais clients.

Le coût marginal d’une exécution était proche de zéro dans les conditions de l’essai. À l’échelle, il faut pourtant compter les tokens, les e-mails, le stockage, l’observabilité, les reprises après erreur, le temps de contrôle humain et le support. Une automatisation rentable est une automatisation dont le coût complet est mesuré, pas seulement celle dont la première facture d’API est vide.

## Ce que je construirais différemment aujourd’hui

J’ajouterais un jeu d’évaluation avant de changer les prompts ou les modèles. Je versionnerais les instructions et enregistrerais le modèle utilisé pour chaque étape.

Je rendrais chaque reprise idempotente afin qu’un double clic ou un webhook rejoué ne déclenche pas deux campagnes. J’ajouterais des délais d’expiration, des tentatives bornées et une file d’échecs inspectable.

Je suivrais le coût et la durée par exécution. Je séparerais les secrets de la configuration fonctionnelle et je réduirais au minimum les données client envoyées aux fournisseurs de modèles.

Enfin, je conserverais les sources utilisées par l’audit. Une recommandation devient beaucoup plus utile lorsque l’on peut revenir au signal qui l’a déclenchée.

## Ce que j’en retiens

Construire avec des contraintes force à distinguer l’indispensable du décoratif. Trois agents n’ont d’intérêt que si leurs responsabilités sont réellement distinctes. Deux validations humaines n’ont de valeur que si elles interviennent avant que les erreurs se propagent.

L’IA n’a pas supprimé la méthode. Elle a rendu ses faiblesses plus visibles : permissions mal comprises, URLs assemblées à la main, sorties illisibles, hypothèses commerciales non mesurées.

Quatre heures ont suffi pour établir une preuve de concept. Transformer cette preuve en produit fiable demande ensuite le travail moins spectaculaire — et plus important — de sécurité, d’évaluation, d’observabilité et de consentement.

Cet article inaugure les notes de terrain de Trigenys Insight : des expériences techniques racontées avec leurs limites, leurs sources et les décisions qu’elles permettent de prendre.`

export const founderDraftMetadata = {
  excerpt:
    'En juin 2026, trois agents IA et deux validations humaines ont transformé un audit marketing en workflow. Architecture, sept bugs et retour critique.',
  kind: 'field-note' as const,
  readingTime: 11,
  slug: 'pipeline-ia-multi-agents-quatre-heures',
  title: 'J’ai construit un pipeline IA multi-agents en quatre heures',
}

export const founderDraftSources = [
  {
    accessedAt: '2026-09-09T00:00:00.000Z',
    language: 'en' as const,
    notes: 'Les limites varient selon le modèle, le niveau d’usage et le projet.',
    publisher: 'Google AI for Developers',
    title: 'Gemini API rate limits',
    url: 'https://ai.google.dev/gemini-api/docs/rate-limits',
  },
  {
    accessedAt: '2026-09-09T00:00:00.000Z',
    language: 'en' as const,
    notes: 'Tarification officielle des modèles Claude via API.',
    publisher: 'Anthropic',
    title: 'Claude API pricing',
    url: 'https://platform.claude.com/docs/en/about-claude/pricing',
  },
  {
    accessedAt: '2026-09-09T00:00:00.000Z',
    language: 'en' as const,
    notes: 'Comportement du nœud Wait et de $execution.resumeUrl.',
    publisher: 'n8n',
    title: 'Wait node documentation',
    url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/',
  },
  {
    accessedAt: '2026-09-09T00:00:00.000Z',
    language: 'en' as const,
    notes: 'Annonce officielle sur Web Bot Auth et les limites appliquées aux bots et agents.',
    publishedAt: '2026-05-07T00:00:00.000Z',
    publisher: 'Shopify',
    title: 'Bots and agents should identify themselves via Web Bot Auth',
    url: 'https://shopify.dev/changelog/bots-and-agents-should-identify-themselves-via-web-bot-auth',
  },
]
