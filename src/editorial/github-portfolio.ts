import type { ArticleInput, SourceInput } from '../../packages/insight-automation/src/schema'

export const portfolioSources: SourceInput[] = [
  {
    title: 'The Future of Jobs Report 2025 — Digest',
    publisher: 'World Economic Forum',
    url: 'https://www.weforum.org/publications/the-future-of-jobs-report-2025/digest/',
    accessedAt: '2026-10-14T07:00:00Z',
    language: 'en',
    notes:
      'Intentions déclarées par les employeurs interrogés pour 2025–2030 ; résultats mondiaux, pas une enquête spécifique au Cameroun.',
  },
  {
    title: 'Using your GitHub profile to enhance your resume',
    publisher: 'GitHub Docs',
    url: 'https://docs.github.com/en/account-and-profile/tutorials/using-your-github-profile-to-enhance-your-resume',
    accessedAt: '2026-10-14T07:00:00Z',
    language: 'en',
  },
]

export const portfolioArticle: Record<'fr' | 'en', ArticleInput> = {
  fr: {
    idempotencyKey: 'github-portfolio-preuves-competences-2026-10-14',
    ownerKey: 'trigenys',
    target: 'trigenys-insight',
    locale: 'fr',
    title: 'Ton GitHub raconte-t-il ce que ton CV promet ?',
    excerpt:
      'Un portfolio convaincant montre un problème, des décisions et un résultat vérifiable. Comment construire cette preuve quand on débute, au Cameroun ou ailleurs en Afrique.',
    categories: [10],
    kind: 'guide',
    readingTime: 6,
    metadata: {
      seo: {
        title: 'Portfolio GitHub : prouver ses compétences de développeur',
        description:
          'Projets, documentation, tests et décisions : construire un portfolio GitHub crédible pour sa carrière de développeur en Afrique.',
      },
    },
    keyTakeaways: [
      {
        text: 'Un dépôt utile permet de comprendre le problème, lancer le projet et vérifier une partie de son comportement.',
      },
      {
        text: 'Un projet pédagogique doit être présenté comme tel ; les résultats professionnels et les métriques doivent rester vérifiables.',
      },
      {
        text: 'L’usage d’une IA n’enlève pas la responsabilité de comprendre, tester et expliquer le code livré.',
      },
    ],
    faq: [
      {
        question: 'Faut-il beaucoup de projets sur GitHub ?',
        answer:
          'La sélection compte davantage que l’accumulation. Quelques projets compréhensibles et pertinents pour le poste permettent de montrer un travail plus précis.',
      },
      {
        question: 'Peut-on montrer un projet réalisé au travail ?',
        answer:
          'Seulement avec les autorisations nécessaires. Sinon, créer une démonstration distincte avec des données fictives et décrire sa contribution sans exposer le code ou les informations de l’employeur.',
      },
    ],
    charts: [
      {
        marker: '[[CHART:skills]]',
        title: 'Ce que les employeurs interrogés prévoient pour leurs compétences',
        description:
          'Intentions mondiales pour 2025–2030 : ces deux réponses peuvent se recouper et ne doivent pas être additionnées. Elles ne mesurent ni les chances d’embauche d’un candidat ni le marché camerounais.',
        sourceLabel: 'World Economic Forum, Future of Jobs Report 2025 — synthèse',
        sourceUrl: portfolioSources[0].url,
        metrics: [
          {
            label: 'Employeurs déclarant cette intention',
            unit: '%',
            precision: 0,
            points: [
              { label: 'Former leurs équipes', value: 85 },
              { label: 'Recruter de nouvelles compétences', value: 70 },
            ],
          },
        ],
      },
    ],
    body: `*« Une promesse ouvre la porte ; une preuve donne envie de te confier les clés. »*

Imagine une candidature qui annonce Python, React, cloud et automatisation. Le lien GitHub est bien là, mais derrière, les dépôts portent encore les noms des tutoriels suivis, les installations échouent et personne ne comprend ce qui a réellement été construit. Le problème ne vient pas de la longueur du CV : le lecteur manque de preuves pour relier les compétences annoncées à un travail observable.

Chez nous, où beaucoup de jeunes développeurs apprennent aussi en dehors des cursus, le portfolio peut rendre cet apprentissage visible. Il faut cependant lui donner une fonction précise : permettre à quelqu’un d’évaluer une contribution, pas simplement montrer qu’on a passé du temps devant un éditeur.

## Le marché des compétences bouge ; ton dossier doit rester lisible

Dans sa [synthèse du Future of Jobs Report 2025](https://www.weforum.org/publications/the-future-of-jobs-report-2025/digest/), le Forum économique mondial rapporte que 85 % des employeurs interrogés envisagent de former leurs équipes et 70 % de recruter des personnes disposant de nouvelles compétences d’ici 2030. Ce sont des intentions mondiales, pas une prévision de ton prochain entretien à Douala.

[[CHART:skills]]

L’enseignement que nous en tirons est pratique : annoncer une compétence récente devient plus utile quand on peut montrer comment on l’applique. Cela ne garantit aucun recrutement, car le diplôme, l’expérience, les critères du poste et les conditions d’embauche continuent de compter.

## Choisis un problème que quelqu’un peut comprendre

Prenons un exemple fictif : un petit atelier veut suivre ses interventions. Il reçoit des demandes, attribue des tâches et cherche ce qui reste à terminer. Une application de suivi peut servir de projet pédagogique, à condition d’expliquer ce que la démonstration couvre réellement.

Le lecteur doit pouvoir identifier l’utilisateur, la difficulté rencontrée et le résultat attendu. Ajouter vingt fonctionnalités avant de clarifier ce point rend surtout le projet plus difficile à évaluer. Une fonction modeste, correctement menée jusqu’au bout, révèle déjà beaucoup : comment tu modèles les données, comment tu traites une erreur et comment tu empêches une action incohérente.

Si tu as réalisé ce projet pour un vrai utilisateur, précise ton rôle. Si c’est une simulation, dis-le. Un projet de formation bien expliqué a une valeur ; lui inventer un client ou un impact mesuré détruit la confiance que tu cherches à construire.

## Fais du dépôt un passage de relais

La [documentation de GitHub consacrée au CV](https://docs.github.com/en/account-and-profile/tutorials/using-your-github-profile-to-enhance-your-resume) recommande de sélectionner quelques projets et de les rendre faciles à explorer. Dans notre exemple, cela commence par une explication qui répond aux questions d’un autre développeur.

Quelles versions faut-il installer ? Comment configurer les variables sans partager de secret ? Comment initialiser des données de démonstration ? Quel scénario permet de vérifier que l’application répond au problème annoncé ? Le README doit aider quelqu’un à franchir ces étapes avec des instructions reproductibles.

Ajoute une capture représentative ou une courte démonstration, puis indique les limites actuelles. Si l’envoi de SMS est simulé, écris-le. Si l’application ne gère pas encore deux modifications simultanées, explique ce que cela implique. La transparence permet au lecteur de distinguer ce qui fonctionne de ce qui reste à construire.

## Montre une décision, puis son coût

Un framework connu ne raconte pas, à lui seul, ton raisonnement. Une courte note peut expliquer pourquoi tu as choisi une base relationnelle, ce que le modèle empêche ou comment tu distingues une erreur utilisateur d’une panne du serveur.

Tu peux aussi montrer un changement précis : une ancienne requête chargeait toutes les interventions, la nouvelle récupère une page à la fois. Décris le scénario et la méthode de vérification. Si tu annonces un gain de performance, garde le protocole, les conditions et les mesures ; sans cela, le chiffre ressemble davantage à une décoration qu’à une preuve.

Les tests intéressants protègent un comportement qui compte pour l’utilisateur. Par exemple, une intervention terminée ne doit pas redevenir active par une action non autorisée. Choisis quelques cas qui révèlent le fonctionnement du système, au lieu de multiplier les tests qui répètent simplement le code.

## L’IA peut accélérer le travail ; elle ne passe pas l’entretien à ta place

Tu peux utiliser une IA pour explorer une solution, écrire un premier jet ou chercher une erreur. La question professionnelle reste ce que tu as vérifié et ce que tu sais expliquer. Un dépôt qui fonctionne uniquement tant que l’assistant fournit la prochaine instruction laisse une dépendance visible.

Garde une trace de tes décisions et vérifie les morceaux sensibles : droits d’accès, entrées invalides, dépendances et exposition des secrets. Si un outil t’a aidé, présenter cet usage avec honnêteté peut ouvrir une discussion utile sur ta méthode. La contribution doit rester identifiable : ce que tu as demandé, compris, corrigé et validé.

## Protéger le travail professionnel fait aussi partie de la preuve

Le code de ton employeur, ses données et ses accès ne deviennent pas publics parce qu’ils enrichiraient ton portfolio. Demande les autorisations nécessaires. À défaut, construis une démonstration indépendante avec des données fictives et décris ton rôle sans reproduire des éléments confidentiels.

Cette contrainte peut améliorer la présentation : elle t’oblige à montrer la compétence transférable, plutôt qu’à exposer un système auquel tu as simplement eu accès.

## Prépare une visite, pas une exposition de badges

À la prochaine candidature, choisis un projet adapté au poste et prépare un parcours court : le problème, une démonstration, une décision et une limite. Vérifie les instructions sur un environnement propre avant de partager le lien.

Ton portfolio n’a pas besoin de raconter une carrière que tu n’as pas encore. Il doit permettre à une personne de voir comment tu travailles aujourd’hui et ce qu’elle pourrait raisonnablement te confier demain.

*Visuel de couverture : illustration générée par IA. L’exemple de l’atelier est fictif ; les conseils de méthode relèvent de l’analyse éditoriale de Trigenys Insight.*`,
  },
  en: {
    idempotencyKey: 'github-portfolio-preuves-competences-2026-10-14',
    ownerKey: 'trigenys',
    target: 'trigenys-insight',
    locale: 'en',
    title: 'Does your GitHub back up the promises on your CV?',
    excerpt:
      'A credible developer portfolio connects a problem, engineering decisions and verifiable work. A practical approach for early-career developers across Africa.',
    categories: [10],
    kind: 'guide',
    readingTime: 5,
    metadata: {
      seo: {
        title: 'GitHub portfolio: show evidence of your developer skills',
        description:
          'Build a credible developer portfolio with a clear problem, reproducible setup, meaningful tests and honest evidence of your contribution.',
      },
    },
    keyTakeaways: [
      {
        text: 'A useful repository explains its problem, provides a reproducible setup and lets someone verify meaningful behaviour.',
      },
      {
        text: 'Learning projects should be labelled honestly; professional outcomes and performance claims need evidence.',
      },
      {
        text: 'AI assistance does not remove responsibility for understanding, testing and explaining the work delivered.',
      },
    ],
    faq: [
      {
        question: 'How many projects should a portfolio contain?',
        answer:
          'Selection matters more than volume. A few clear projects relevant to the role give a reviewer more usable evidence than a long list of unfinished repositories.',
      },
      {
        question: 'Can I publish a project built at work?',
        answer:
          'Only with the necessary permission. Otherwise, build an independent demonstration using fictional data and describe your contribution without exposing employer code or confidential information.',
      },
    ],
    charts: [
      {
        marker: '[[CHART:skills]]',
        title: 'What surveyed employers plan to do about skills',
        description:
          'Global intentions for 2025–2030. Responses can overlap and must not be added together. They measure neither an individual applicant’s hiring chances nor an African country’s labour market.',
        sourceLabel: 'World Economic Forum, Future of Jobs Report 2025 — digest',
        sourceUrl: portfolioSources[0].url,
        metrics: [
          {
            label: 'Employers reporting this intention',
            unit: '%',
            precision: 0,
            points: [
              { label: 'Upskill their workforce', value: 85 },
              { label: 'Hire people with new skills', value: 70 },
            ],
          },
        ],
      },
    ],
    body: `*“A promise opens the door; evidence makes someone trust you with the keys.”*

A developer applying from Accra, Lagos or Nairobi can list Python, React, cloud and automation on a CV. Yet a reviewer opening the attached GitHub link may find tutorial names, broken setup instructions and no explanation of what the applicant contributed. The skills might be real. The evidence connecting them to observable work is missing.

For an early-career developer, a portfolio is a chance to make learning visible. Its practical job is to let another person inspect a contribution without having to reconstruct the entire story from a list of technologies.

## Changing skills make clear evidence useful

The World Economic Forum’s [Future of Jobs Report 2025 digest](https://www.weforum.org/publications/the-future-of-jobs-report-2025/digest/) says 85% of surveyed employers plan to prioritise workforce upskilling and 70% expect to hire people with new skills by 2030. These are global employer intentions, not a prediction of a particular African applicant’s next interview.

[[CHART:skills]]

Our editorial inference is straightforward: a new skill becomes easier to assess when someone can see it applied. A portfolio still cannot guarantee employment. Qualifications, experience, role requirements and hiring conditions remain relevant.

## Start with an understandable problem

Consider a fictional repair workshop that needs to track jobs, assign technicians and identify unfinished work. A small application can be a worthwhile learning project if its scope is clear.

Explain the user’s problem and what the demonstration actually solves. A modest feature taken through design, implementation and verification can show how you structure data, handle failure and prevent inconsistent actions. Adding more screens does not automatically produce stronger evidence.

If the project served a real customer, identify your role accurately. If it is a simulation, label it as one. A well-explained learning project has value; inventing a customer or an impact figure weakens the trust you want to build.

## Make the repository a handover

GitHub’s [guide to strengthening a CV with a profile](https://docs.github.com/en/account-and-profile/tutorials/using-your-github-profile-to-enhance-your-resume) recommends selecting projects and making them easy to explore. For our example, think about what another developer needs to take the next step.

Document the required versions, safe configuration, demo data and a scenario that shows the core behaviour. Someone should be able to follow the setup without being handed a private credential or guessing which instruction is still current.

Include a representative screenshot or short demonstration and explain limitations. If SMS delivery is mocked, say so. If simultaneous edits are not handled yet, describe the consequence. This makes the boundary between working behaviour and future work visible.

## Show a decision and its trade-off

A framework name rarely explains engineering judgement. A short note can describe why you chose a relational model, which invalid states it prevents or how user errors differ from server failures.

You can also document a focused improvement: a query once retrieved every repair job and now retrieves a page at a time. Explain how you verified the change. Performance claims need a repeatable method and measurement conditions, rather than an attractive percentage without context.

Choose tests that protect behaviour important to the user. For example, a completed job should not return to an active state through an unauthorised action. A few meaningful cases tell a reviewer more about your understanding than many tests that merely repeat implementation details.

## AI assistance still leaves you responsible

An AI tool can help explore an approach, draft code or investigate an error. The professional question is what you understood, checked and can explain. A project that only moves forward when an assistant supplies the next instruction leaves a dependency that a technical discussion may reveal.

Keep track of decisions and review sensitive areas: access control, invalid input, dependencies and secret handling. Be honest about assistance while making your own contribution identifiable. Explain what you asked for, changed and verified.

## Respecting confidentiality is part of professional evidence

Employer code, data and access credentials do not become public portfolio material simply because they would be impressive. Obtain permission. Where that is unavailable, create an independent demonstration with fictional data and describe your contribution without reproducing confidential material.

That limitation can help you focus on transferable skills rather than showing a system you happened to access.

## Prepare a short guided visit

For the next application, select one project relevant to the role. Prepare a clear route through its problem, demonstration, one engineering decision and one limitation. Check the setup on a clean environment before sharing the link.

Your portfolio does not need to invent a career you have not had. It should let someone understand how you work today and what they could reasonably trust you to deliver next.

*Cover image: AI-generated illustration. The workshop example is fictional; the methodological advice is Trigenys Insight’s editorial analysis.*`,
  },
}
