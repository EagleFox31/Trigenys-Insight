import type { EditorialLaunchArticle, EditorialChartInput } from './editorial-launch-pack'

/** Four sourced rounds, four real Payload chart blocks; FR + independent EN copy.
 * Research snapshot: 2026-10-14. Import as DRAFT only. */
export const geminiArgonArticle: EditorialLaunchArticle & {
  charts: Array<{ marker: string; fr: EditorialChartInput; en: EditorialChartInput }>
} = {
  "id": "2026-10-14-gemini-4-argon-versus-claude-chatgpt",
  "slug": "gemini-4-argon-vs-claude-chatgpt-test-developpeurs-createurs",
  "primaryCategory": "technology",
  "categories": [
    "technology",
    "information-systems",
    "business"
  ],
  "kind": "analysis",
  "readingTime": 11,
  "featured": false,
  "editorsPick": true,
  "fr": {
    "title": "Gemini 4 Argon vs Claude et ChatGPT : qui code et crée vraiment mieux ?",
    "excerpt": "Quatre rounds, quatre graphiques sourcés. Nous confrontons les performances de Gemini 4 Argon à Claude Opus 5.5 et GPT-6 Astra : web, code, animations et vidéo.",
    "metaTitle": "Gemini 4 Argon vs Claude Opus 5.5 et GPT-6 Astra : tests réels",
    "metaDescription": "Gemini 4 Argon est-il meilleur que Claude Opus 5.5 et GPT-6 Astra pour coder, créer des sites, animations et vidéos ? Quatre graphiques, des tests et un verdict.",
    "content": "*Vous codez avec Claude Code, corrigez vos bugs avec ChatGPT et utilisez Gemini pour chercher ou concevoir des visuels ? Le lancement de Gemini 4 Argon pose une question beaucoup plus utile que « quel modèle est numéro un ? » : vous fera-t-il livrer plus vite un résultat exploitable, avec moins de reprises ? Nous avons recoupé les classements, les tests exécutés et les premiers retours créatifs du 13 octobre 2026.*\n\nTrois assistants ouverts, un prototype à terminer, une maquette à corriger et peut-être trois abonnements à payer. Dans la vraie vie des développeurs et des créateurs, la concurrence des IA se mesure en heures gagnées, en corrections évitées et en budget préservé. Pas en superlatifs.\n\nGoogle a ouvert largement l'accès à [Gemini 4 Argon le 13 octobre 2026](https://www.reuters.com/business/google-launches-flagship-ai-model-gemini-4-argon-developers-businesses-2026-10-13/), après une phase de lancement réservée à certains spécialistes de cybersécurité. Son argument : mieux conduire des missions complexes et longues avec des outils. Nous avons réparti les observations en quatre rounds où les chiffres sont cliquables, mais où les méthodes comptent autant que les scores.\n\n## Avant les rounds : qu'apporte Argon face à Gemini 3.1 Pro ?\n\nGemini 3.1 Pro savait déjà analyser de gros documents, comprendre des images et produire du code. Argon met surtout l'accent sur la continuité de tâches longues, l'utilisation d'outils et une génération prolongée. Sa [fiche API](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon) indique une fenêtre **unifiée** d'environ un million de tokens, qui inclut entrées, raisonnement et sortie. En usage synchrone standard, la sortie maximale est de 65 536 tokens ; la génération allant jusqu'à la fenêtre entière utilise un protocole particulier. Ce n'est donc pas un million de tokens systématiquement délivrés en une réponse.\n\nEn pratique : le gain potentiel n'est pas de rédiger dix fois plus de code, mais de conserver plus longtemps les contraintes d'un projet, son historique et ses dépendances. Cette promesse exige des tests sur de vrais dépôts : aucune taille de contexte ne garantit à elle seule l'absence de régressions.\n\n## Round 1 — Créer un site : qui propose le meilleur rendu ?\n\nSur [WebDev Arena](https://arena.ai/leaderboard/code/webdev), au 13 octobre 2026, **Claude Opus 5.5 Max** domine avec **1 811 points**, suivi de **GPT-6 Astra Max** à **1 780**. **Gemini 4 Argon High** est **neuvième** à **1 678**, avec un score encore provisoire. Ici, ce sont des préférences recueillies sur des tâches web ; il ne s'agit ni d'un taux de réussite ni d'un test d'intégration en production.\n\n[[TRIGENYS_ARGON_ROUND_1]]\n\nLe signal est net : pour un site vitrine, un dashboard ou une interface SaaS au rendu soigné, le nouveau Google n'a pas encore supplanté les deux concurrents dans ce classement. [Analytics Vidhya](https://www.analyticsvidhya.com/blog/2026/10/gemini-4-argon-review/) a pourtant obtenu avec Argon une page interactive de réservation pour un atelier de poterie. Elle fonctionnait en démonstration, mais **sans véritable système de réservation connecté**. Un joli aperçu et une application prête à servir des clients ne sont pas la même chose.\n\n**Notre lecture :** si votre travail est d'abord une interface React fidèle à un design, il n'existe pas encore d'argument chiffré suffisant pour abandonner Claude ou Astra. Testez surtout la fidélité visuelle et la capacité à préserver l'UI après trois séries de modifications.\n\n## Round 2 — Faire fonctionner le code : l'histoire change selon le test\n\nLa [fiche d'évaluation publiée par Google DeepMind](https://deepmind.google/models/model-cards/gemini-4-argon/) montre un Argon performant sur **DeepSWE v1.1** (77,9 %), devant Astra (74,1 %) et Opus 5.5 (74,2 %). Mais **FrontierSWE v2** inverse le résultat : Argon 55 %, Astra 65,5 %, Opus 62,3 %. Sur **Terminal-Bench 4.0**, Opus mène encore, avec 66,4 % contre 58,2 % pour Astra et 57,4 % pour Argon.\n\n[[TRIGENYS_ARGON_ROUND_2]]\n\nLes boutons du graphique permettent de changer de benchmark sans mélanger les méthodes. Ces pourcentages sont spécifiques à chaque jeu de tâches : **ne calculez pas de moyenne artisanale pour décréter un vainqueur global**.\n\nLe test concret de [ComputingForGeeks](https://computingforgeeks.com/gemini-4-argon-released-features-benchmarks/) est particulièrement instructif : douze configurations Kubernetes générées par Argon passaient les contrôles de syntaxe, mais aucune ne démarrait correctement Nginx dans l'environnement testé. Lorsque l'erreur d'exécution lui a été fournie, Argon a ensuite su corriger son résultat. L'échantillon reste trop petit pour classer définitivement les modèles, mais le message est clair : **valide ne veut pas dire opérationnel**.\n\n**Notre lecture :** utilisez des tests automatisés, la vérification du build, le lancement réel et une mesure du nombre d'itérations. Les tâches dans le terminal peuvent avantager Opus, tandis que des exercices logiciels plus longs donnent parfois l'avantage à Argon ou Astra.\n\n## Round 3 — Animations et créations interactives : le prix peut renverser la partie\n\nSur les créations codées — une animation Three.js, une scène pixel-art interactive, une simulation — les premiers témoignages donnent un angle différent. [This Week in AI](https://www.thisweekinai.ai/p/does-gemini-4-argon-put-google-back) rapporte une comparaison publiée par Jazii : un même prompt de **ville fantastique en pixel-art**, résultat jugé proche, **1,20 $ en 13 minutes** pour Argon via Devin, contre **8,20 $ en 15 minutes** pour Opus via Claude Code.\n\n[[TRIGENYS_ARGON_ROUND_3]]\n\nLe graphique représente **les coûts et durées de cette seule expérimentation**, et non un prix garanti par création. Ce sont deux outils d'exécution différents ; la comparaison est suggestive, mais elle n'isole pas scientifiquement la performance intrinsèque des modèles. Autre essai relayé par la même source : la simulation de lampe à lave de BridgeMind, annoncée à 0,18 $ et moins de deux minutes avec Argon, contre 1,27 $ et environ 9 minutes 35 secondes avec Opus.\n\nIl faut surtout éviter une confusion : [Argon n'est pas un moteur de génération d'images](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon). Sa sortie API est du texte. Il peut écrire du HTML, du CSS, du JavaScript et guider des outils qui fabriquent un visuel interactif. Pour des portraits, affiches et photographies générés directement, c'est **le modèle image employé** qu'il faut comparer, pas seulement l'assistant conversationnel.\n\n**Notre lecture :** pour des scènes codées et des prototypes créatifs, Argon mérite un test sérieux. Pour juger la qualité d'une affiche ou d'une image produit, il faut d'autres essais, avec des moteurs d'image et des prompts identiques.\n\n## Round 4 — Vidéo : comprendre les images n'est pas monter tout seul\n\nLa fiche Google donne à Argon **91,7 % sur LVBench**, un test de compréhension vidéo, contre **87,5 % pour Astra** et **83,7 % pour Opus**. Sur **Chartography**, consacré à la compréhension de graphiques, l'avance d'Argon est plus faible : 71,6 % contre 71,0 % pour Astra et 66,3 % pour Opus.\n\n[[TRIGENYS_ARGON_ROUND_4]]\n\nCes résultats indiquent une **compréhension multimodale**, pas une capacité garantie à livrer un montage professionnel fini. Le créateur Tim Simmons (chaîne [Theoretically Media](https://www.youtube.com/watch?v=DD4oHSH5SEI)) a connecté Argon à DaVinci Resolve et lui a confié environ 90 minutes d'entretien à transformer en une vidéo d'une dizaine de minutes. D'après son retour relayé par This Week in AI, il a fallu des ajustements humains ; le modèle a toutefois continué le travail après corrections.\n\n**Notre lecture :** prometteur pour le dérushage, la structuration et le pré-montage, mais ce n'est pas une démonstration de remplacement d'un monteur. Le montage réussi dépend aussi du rythme, des coupes, du son et des intentions éditoriales.\n\n## Et le prix de l'abonnement dans tout ça ?\n\nLe [tarif API annoncé](https://ai.google.dev/gemini-api/docs/pricing) est de 2 $ / million de tokens d'entrée et 10 $ / million de tokens de sortie jusqu'au **30 novembre 2026**, puis passe à 4 $ et 20 $. Un utilisateur de l'application Gemini n'est pas automatiquement facturé comme un développeur via l'API, et l'accès à certains workflows Antigravity relève de niveaux d'abonnement spécifiques. Comparer ces chiffres aux abonnements ChatGPT et Claude sans tenir compte des limites et outils serait trompeur.\n\n**Un conseil pratique :** gardez votre outil principal, puis envoyez trois vrais exercices à chaque concurrent : reproduire une maquette avec contraintes responsive, corriger un bug avec tests et construire une création interactive. Notez les minutes réellement passées, les fonctionnalités réussies et les régressions. Ce mini-protocole vaut davantage que les captures de scores partagées sans méthode.\n\n## Verdict Trigenys Insight\n\nGemini 4 Argon n'est ni un gadget ni un vainqueur universel. Les mesures disponibles lui reconnaissent des qualités en contexte long, raisonnement et compréhension multimodale. Mais Opus et Astra gardent des avantages tangibles en création web et sur certains problèmes de programmation. Les premiers cas créatifs suggèrent pour Argon un rapport coût/résultat potentiellement intéressant, **sans autoriser pour l'instant de généralisation**.\n\nLe meilleur modèle ne sera pas forcément celui qui écrit le plus vite « terminé ». Ce sera celui dont vous pouvez ouvrir le projet, lancer les tests, inspecter le résultat, demander une correction — et **livrer sans passer votre soirée à réparer ce qu'il vient de casser**.\n\n*Sources actualisées au 14 octobre 2026. Les classements, coûts promotionnels et performances préliminaires peuvent évoluer ; les tests communautaires sont décrits comme tels.*"
  },
  "en": {
    "title": "Gemini 4 Argon vs Claude and ChatGPT: Which One Actually Builds Better?",
    "excerpt": "Four rounds and four sourced interactive charts. What Gemini 4 Argon really changes versus Claude Opus 5.5 and GPT-6 Astra for websites, coding, visual prototypes and video.",
    "metaTitle": "Gemini 4 Argon vs Claude Opus 5.5 and GPT-6 Astra: Practical Tests",
    "metaDescription": "Four sourced charts compare Gemini 4 Argon with Claude Opus 5.5 and GPT-6 Astra across web development, coding, interactive visuals and video.",
    "content": "*You code with Claude Code, debug with ChatGPT and use Gemini to research or prototype visuals. Does the newly launched Gemini 4 Argon give you a concrete reason to switch? We cross-checked rankings, executable tests and early creative reports from 13 October 2026. The answer is less dramatic than the launch headline — and more useful.*\n\nThree assistants open, a product to ship, a design to refine, and several subscriptions to pay. For developers and creators, the AI race should be measured in successful deliveries, avoided rework and total cost.\n\n[Google expanded access to Gemini 4 Argon on 13 October](https://www.reuters.com/business/google-launches-flagship-ai-model-gemini-4-argon-developers-businesses-2026-10-13/) following an earlier restricted cybersecurity rollout. Its pitch is sustained multi-step reasoning and tool use. We examine that claim in four rounds, each with a sourced, interactive chart.\n\n## Before the rounds: what's new compared with Gemini 3.1 Pro?\n\nGemini 3.1 Pro could already read large documents, interpret images and write code. Argon focuses on longer workflows and tool orchestration. According to [Google's API reference](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon), its unified input-and-output window extends to about one million tokens, but regular synchronous generation is limited to 65,536 output tokens; extended decoding requires a dedicated continuation mechanism. Long context is a capability, not proof that every requirement will be remembered accurately.\n\nThe useful question is not how much code it can produce. It is whether it can maintain the same project's requirements across multiple revisions without creating regressions.\n\n## Round 1 — Website design: which output actually looks better?\n\nOn the [WebDev Arena leaderboard](https://arena.ai/leaderboard/code/webdev) dated 13 October 2026, **Claude Opus 5.5 Max** ranks first with **1,811 points**, followed by **GPT-6 Astra Max** with **1,780**. **Gemini 4 Argon High** is ninth at **1,678**, with a preliminary score. These are human preference ratings for web development outputs, not production pass rates.\n\n[[TRIGENYS_ARGON_ROUND_1]]\n\nAn [Analytics Vidhya hands-on test](https://www.analyticsvidhya.com/blog/2026/10/gemini-4-argon-review/) did produce a working responsive pottery-workshop booking prototype with Argon. Yet it had no actual external reservation backend. A working preview is not a production-ready application.\n\n**Takeaway:** if your main job is polishing a SaaS dashboard or matching a React interface to a design, there is no strong evidence yet to abandon Claude or Astra. Measure fidelity after repeated revisions, not just the first screenshot.\n\n## Round 2 — Functional code: the winner depends on the test\n\nAccording to [Google DeepMind's own model card](https://deepmind.google/models/model-cards/gemini-4-argon/), Argon scores **77.9% on DeepSWE v1.1** against Astra's 74.1% and Opus 5.5's 74.2%. On **FrontierSWE v2**, however, Argon scores 55%, Astra 65.5% and Opus 62.3%. On **Terminal-Bench 4.0**, Opus leads with 66.4%, against Astra's 58.2% and Argon's 57.4%.\n\n[[TRIGENYS_ARGON_ROUND_2]]\n\nUse the chart's metric switcher to compare one benchmark at a time. **Do not average these scores:** the task sets and methodologies are different.\n\nIn a small real-world [ComputingForGeeks test](https://computingforgeeks.com/gemini-4-argon-released-features-benchmarks/), twelve Kubernetes configurations generated by Argon passed syntax validation but failed to launch Nginx correctly on the test cluster. The model could fix its output when supplied with runtime errors. The sample is small, but it captures a painful engineering truth: **valid configuration is not the same as a running service**.\n\n**Takeaway:** compare models using actual build, test and deployment results. The best AI is the one that produces fewer broken iterations on your own stack.\n\n## Round 3 — Interactive visuals: cost changes the conversation\n\n[This Week in AI](https://www.thisweekinai.ai/p/does-gemini-4-argon-put-google-back) reports a creator's same-prompt pixel-art fantasy city comparison. Argon, used through Devin, cost **$1.20 and took 13 minutes**; Opus 5.5, used through Claude Code, cost **$8.20 and took 15 minutes**. The creator found the outputs broadly similar.\n\n[[TRIGENYS_ARGON_ROUND_3]]\n\nThis chart covers **one reported experiment**, not average prices. Different execution tools confound any model-only conclusion. Another early demonstration, BridgeMind's lava-lamp simulation, reportedly cost $0.18 in under two minutes on Argon versus $1.27 in about nine and a half minutes on Opus.\n\nCrucially, [Argon's API does not generate images directly](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon). It outputs text and can write code that drives interactive visuals or other creative tools. If you want posters, portraits or product photography, the relevant comparison is between the **actual image-generation models**, not their chat assistants.\n\n**Takeaway:** Argon deserves serious trials for coded animation, Three.js worlds and interactive prototypes. It is not automatically the better tool for static image production.\n\n## Round 4 — Video: understanding footage is not finishing an edit\n\nGoogle reports **91.7% for Argon on LVBench**, a video understanding benchmark, against **87.5% for Astra** and **83.7% for Opus**. On **Chartography**, evaluating chart understanding, Argon scores 71.6%, Astra 71.0% and Opus 66.3%.\n\n[[TRIGENYS_ARGON_ROUND_4]]\n\nThese are multimodal comprehension scores — **not professional video editing completion rates**. Creator Tim Simmons of [Theoretically Media](https://www.youtube.com/watch?v=DD4oHSH5SEI) reportedly linked Argon to DaVinci Resolve and edited roughly 90 minutes of interview footage down to around ten minutes. Human producer passes were still needed, according to the account collected by This Week in AI.\n\n**Takeaway:** this is promising for logging footage, rough cuts and structured editing workflows, but not a reason to retire the human editor.\n\n## How much does switching actually cost?\n\n[Google's published API pricing](https://ai.google.dev/gemini-api/docs/pricing) starts at **$2 per million input tokens and $10 per million output tokens** until **30 November 2026**. From 1 December, those rates double to $4 and $20. Chat subscriptions, API usage and access to development tools such as Antigravity are different products with different limitations.\n\nA practical evaluation is simple: give every model the same responsive UI exercise, the same backend bug with tests and the same interactive graphics task. Record elapsed time, accepted output, corrections and total spending. The best model for your work will become visible faster than it does in a universal leaderboard.\n\n## Trigenys Insight verdict\n\nArgon is a serious contender, not a universal winner. Its long-context and multimodal capabilities are compelling, while Opus and Astra remain strong in website generation and several coding tests. Early creative experiments suggest a potentially attractive cost-to-result ratio for Argon, but **not a statistically established advantage**.\n\nJudge the AI by the code you can execute, the visuals you can actually use, and the work you can ship — **not by how quickly it announces it's finished**.\n\n*Data and sources reviewed on 14 October 2026. Rankings and introductory pricing may change; community anecdotes are explicitly identified as such.*"
  },
  "sources": [
    {
      "title": "Gemini 4 Argon model card",
      "publisher": "Google DeepMind",
      "url": "https://deepmind.google/models/model-cards/gemini-4-argon/",
      "publishedAt": "2026-10-13",
      "accessedAt": "2026-10-14",
      "language": "en"
    },
    {
      "title": "Gemini 4 Argon API",
      "publisher": "Google AI for Developers",
      "url": "https://ai.google.dev/gemini-api/docs/models/gemini-4-argon",
      "accessedAt": "2026-10-14",
      "language": "en"
    },
    {
      "title": "Gemini API pricing",
      "publisher": "Google AI for Developers",
      "url": "https://ai.google.dev/gemini-api/docs/pricing",
      "accessedAt": "2026-10-14",
      "language": "en"
    },
    {
      "title": "WebDev Arena ranking",
      "publisher": "Arena",
      "url": "https://arena.ai/leaderboard/code/webdev",
      "accessedAt": "2026-10-14",
      "language": "en"
    },
    {
      "title": "Gemini 4 Argon coding and benchmark test",
      "publisher": "ComputingForGeeks",
      "url": "https://computingforgeeks.com/gemini-4-argon-released-features-benchmarks/",
      "publishedAt": "2026-10-13",
      "accessedAt": "2026-10-14",
      "language": "en"
    },
    {
      "title": "Gemini 4 Argon hands-on review",
      "publisher": "Analytics Vidhya",
      "url": "https://www.analyticsvidhya.com/blog/2026/10/gemini-4-argon-review/",
      "publishedAt": "2026-10-14",
      "accessedAt": "2026-10-14",
      "language": "en"
    },
    {
      "title": "Does Gemini 4 Argon put Google back on the AI frontier?",
      "publisher": "This Week in AI",
      "url": "https://www.thisweekinai.ai/p/does-gemini-4-argon-put-google-back",
      "publishedAt": "2026-10-13",
      "accessedAt": "2026-10-14",
      "language": "en"
    },
    {
      "title": "Google launches flagship AI model",
      "publisher": "Reuters",
      "url": "https://www.reuters.com/business/google-launches-flagship-ai-model-gemini-4-argon-developers-businesses-2026-10-13/",
      "publishedAt": "2026-10-13",
      "accessedAt": "2026-10-14",
      "language": "en"
    },
    {
      "title": "Google Cooked! Testing Gemini 4 Argon",
      "publisher": "Theoretically Media",
      "url": "https://www.youtube.com/watch?v=DD4oHSH5SEI",
      "accessedAt": "2026-10-14",
      "language": "en"
    }
  ],
  "charts": [
    {
      "marker": "[[TRIGENYS_ARGON_ROUND_1]]",
      "fr": {
        "title": "Round 1 · Préférences en création web",
        "description": "Scores Arena ; Argon provisoire au 13/10/2026. Les points ne sont pas des pourcentages de réussite.",
        "sourceLabel": "WebDev Arena · 13 octobre 2026",
        "sourceUrl": "https://arena.ai/leaderboard/code/webdev",
        "metrics": [
          {
            "label": "Score WebDev Arena",
            "unit": "points",
            "precision": 0,
            "points": [
              {
                "label": "Claude Opus 5.5",
                "value": 1811
              },
              {
                "label": "GPT-6 Astra",
                "value": 1780
              },
              {
                "label": "Gemini 4 Argon",
                "value": 1678
              }
            ]
          }
        ]
      },
      "en": {
        "title": "Round 1 · Web development preference ratings",
        "description": "Arena points, 13 Oct 2026; Argon preliminary. Ratings are not task completion percentages.",
        "sourceLabel": "WebDev Arena · 13 octobre 2026",
        "sourceUrl": "https://arena.ai/leaderboard/code/webdev",
        "metrics": [
          {
            "label": "WebDev Arena rating",
            "unit": "points",
            "precision": 0,
            "points": [
              {
                "label": "Claude Opus 5.5",
                "value": 1811
              },
              {
                "label": "GPT-6 Astra",
                "value": 1780
              },
              {
                "label": "Gemini 4 Argon",
                "value": 1678
              }
            ]
          }
        ]
      }
    },
    {
      "marker": "[[TRIGENYS_ARGON_ROUND_2]]",
      "fr": {
        "title": "Round 2 · Programmation : quel benchmark ?",
        "description": "Chaque onglet est un benchmark distinct. Résultats fournis par Google, non équivalents à des tests indépendants en production.",
        "sourceLabel": "Google DeepMind · model card · octobre 2026",
        "sourceUrl": "https://deepmind.google/models/model-cards/gemini-4-argon/",
        "metrics": [
          {
            "label": "DeepSWE v1.1",
            "unit": "%",
            "precision": 1,
            "points": [
              {
                "label": "Gemini 4 Argon",
                "value": 77.9
              },
              {
                "label": "GPT-6 Astra",
                "value": 74.1
              },
              {
                "label": "Claude Opus 5.5",
                "value": 74.2
              }
            ]
          },
          {
            "label": "FrontierSWE v2",
            "unit": "%",
            "precision": 1,
            "points": [
              {
                "label": "Gemini 4 Argon",
                "value": 55
              },
              {
                "label": "GPT-6 Astra",
                "value": 65.5
              },
              {
                "label": "Claude Opus 5.5",
                "value": 62.3
              }
            ]
          },
          {
            "label": "Terminal-Bench 4.0",
            "unit": "%",
            "precision": 1,
            "points": [
              {
                "label": "Gemini 4 Argon",
                "value": 57.4
              },
              {
                "label": "GPT-6 Astra",
                "value": 58.2
              },
              {
                "label": "Claude Opus 5.5",
                "value": 66.4
              }
            ]
          },
          {
            "label": "Vibe Code Bench",
            "unit": "%",
            "precision": 1,
            "points": [
              {
                "label": "Gemini 4 Argon",
                "value": 91.9
              },
              {
                "label": "GPT-6 Astra",
                "value": 89.6
              },
              {
                "label": "Claude Opus 5.5",
                "value": 90.3
              }
            ]
          }
        ]
      },
      "en": {
        "title": "Round 2 · Coding: which benchmark?",
        "description": "Each tab shows a separate benchmark. Google-published figures, not independent production outcomes.",
        "sourceLabel": "Google DeepMind · model card · octobre 2026",
        "sourceUrl": "https://deepmind.google/models/model-cards/gemini-4-argon/",
        "metrics": [
          {
            "label": "DeepSWE v1.1",
            "unit": "%",
            "precision": 1,
            "points": [
              {
                "label": "Gemini 4 Argon",
                "value": 77.9
              },
              {
                "label": "GPT-6 Astra",
                "value": 74.1
              },
              {
                "label": "Claude Opus 5.5",
                "value": 74.2
              }
            ]
          },
          {
            "label": "FrontierSWE v2",
            "unit": "%",
            "precision": 1,
            "points": [
              {
                "label": "Gemini 4 Argon",
                "value": 55
              },
              {
                "label": "GPT-6 Astra",
                "value": 65.5
              },
              {
                "label": "Claude Opus 5.5",
                "value": 62.3
              }
            ]
          },
          {
            "label": "Terminal-Bench 4.0",
            "unit": "%",
            "precision": 1,
            "points": [
              {
                "label": "Gemini 4 Argon",
                "value": 57.4
              },
              {
                "label": "GPT-6 Astra",
                "value": 58.2
              },
              {
                "label": "Claude Opus 5.5",
                "value": 66.4
              }
            ]
          },
          {
            "label": "Vibe Code Bench",
            "unit": "%",
            "precision": 1,
            "points": [
              {
                "label": "Gemini 4 Argon",
                "value": 91.9
              },
              {
                "label": "GPT-6 Astra",
                "value": 89.6
              },
              {
                "label": "Claude Opus 5.5",
                "value": 90.3
              }
            ]
          }
        ]
      }
    },
    {
      "marker": "[[TRIGENYS_ARGON_ROUND_3]]",
      "fr": {
        "title": "Round 3 · Une ville pixel-art, deux environnements",
        "description": "Expérience individuelle rapportée : même prompt, mais Argon via Devin et Opus via Claude Code. Valeurs non généralisables.",
        "sourceLabel": "This Week in AI · Jazii · 13 octobre 2026",
        "sourceUrl": "https://www.thisweekinai.ai/p/does-gemini-4-argon-put-google-back",
        "metrics": [
          {
            "label": "Coût de la session",
            "unit": "USD",
            "precision": 2,
            "points": [
              {
                "label": "Gemini 4 Argon / Devin",
                "value": 1.2
              },
              {
                "label": "Claude Opus 5.5 / Claude Code",
                "value": 8.2
              }
            ]
          },
          {
            "label": "Durée de la session",
            "unit": "min",
            "precision": 0,
            "points": [
              {
                "label": "Gemini 4 Argon / Devin",
                "value": 13
              },
              {
                "label": "Claude Opus 5.5 / Claude Code",
                "value": 15
              }
            ]
          }
        ]
      },
      "en": {
        "title": "Round 3 · One pixel-art city, two environments",
        "description": "One creator's report: same prompt, but Argon via Devin and Opus via Claude Code. Not generalisable.",
        "sourceLabel": "This Week in AI · Jazii · 13 octobre 2026",
        "sourceUrl": "https://www.thisweekinai.ai/p/does-gemini-4-argon-put-google-back",
        "metrics": [
          {
            "label": "Reported session cost",
            "unit": "USD",
            "precision": 2,
            "points": [
              {
                "label": "Gemini 4 Argon / Devin",
                "value": 1.2
              },
              {
                "label": "Claude Opus 5.5 / Claude Code",
                "value": 8.2
              }
            ]
          },
          {
            "label": "Reported session duration",
            "unit": "min",
            "precision": 0,
            "points": [
              {
                "label": "Gemini 4 Argon / Devin",
                "value": 13
              },
              {
                "label": "Claude Opus 5.5 / Claude Code",
                "value": 15
              }
            ]
          }
        ]
      }
    },
    {
      "marker": "[[TRIGENYS_ARGON_ROUND_4]]",
      "fr": {
        "title": "Round 4 · Compréhension vidéo et de graphiques",
        "description": "Scores de compréhension multimodale publiés par Google ; ils ne mesurent PAS la qualité d'un montage terminé.",
        "sourceLabel": "Google DeepMind · model card · octobre 2026",
        "sourceUrl": "https://deepmind.google/models/model-cards/gemini-4-argon/",
        "metrics": [
          {
            "label": "LVBench · compréhension vidéo",
            "unit": "%",
            "precision": 1,
            "points": [
              {
                "label": "Gemini 4 Argon",
                "value": 91.7
              },
              {
                "label": "GPT-6 Astra",
                "value": 87.5
              },
              {
                "label": "Claude Opus 5.5",
                "value": 83.7
              }
            ]
          },
          {
            "label": "Chartography · graphiques",
            "unit": "%",
            "precision": 1,
            "points": [
              {
                "label": "Gemini 4 Argon",
                "value": 71.6
              },
              {
                "label": "GPT-6 Astra",
                "value": 71
              },
              {
                "label": "Claude Opus 5.5",
                "value": 66.3
              }
            ]
          }
        ]
      },
      "en": {
        "title": "Round 4 · Video and chart understanding",
        "description": "Google-published comprehension scores; they do NOT measure completed video-editing quality.",
        "sourceLabel": "Google DeepMind · model card · octobre 2026",
        "sourceUrl": "https://deepmind.google/models/model-cards/gemini-4-argon/",
        "metrics": [
          {
            "label": "LVBench · video understanding",
            "unit": "%",
            "precision": 1,
            "points": [
              {
                "label": "Gemini 4 Argon",
                "value": 91.7
              },
              {
                "label": "GPT-6 Astra",
                "value": 87.5
              },
              {
                "label": "Claude Opus 5.5",
                "value": 83.7
              }
            ]
          },
          {
            "label": "Chartography · chart understanding",
            "unit": "%",
            "precision": 1,
            "points": [
              {
                "label": "Gemini 4 Argon",
                "value": 71.6
              },
              {
                "label": "GPT-6 Astra",
                "value": 71
              },
              {
                "label": "Claude Opus 5.5",
                "value": 66.3
              }
            ]
          }
        ]
      }
    }
  ]
}
