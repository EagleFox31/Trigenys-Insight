import type { SiteLocale } from './config'

const messages = {
  fr: {
    header: {
      tech: 'Tech',
      business: 'Business',
      systems: "Systèmes d'information",
      africa: 'Afrique',
      methodology: 'Méthodologie',
      brief: 'Le Brief',
      navLabel: 'Navigation principale',
    },
    footer: {
      tagline: 'Research for better decisions.',
      explore: 'Explorer',
      analyses: 'Analyses',
      methodology: 'Méthodologie',
      newsletter: 'Newsletter',
      newsroom: 'Rédaction',
      place: 'Conçu à Douala. Pensé pour aller loin.',
    },
    home: {
      publication: 'Publication indépendante · Douala, Cameroun',
      titleLine1: 'Comprendre les systèmes.',
      titleLine2: 'Décider avec lucidité.',
      intro:
        'Trigenys Insights croise recherche, données et expérience terrain pour éclairer les décisions en technologie, cybersécurité, business et transformation numérique.',
      explore: "Explorer nos champs d'analyse",
      founderKicker: 'Dossier fondateur · En préparation',
      founderTitle: 'Le premier article est déjà dans la salle de rédaction.',
      founderText:
        "Le socle éditorial est prêt. Les articles restent en brouillon jusqu'à validation de leurs chiffres, sources et exemples — le bouton Publier mérite un peu de respect.",
      fields: "Nos champs d'analyse",
      fieldsTitle: 'Quatre angles. Une même exigence.',
      latest: 'Dernières publications',
      latestTitle: 'Les analyses à lire maintenant.',
      viewAll: 'Voir toutes les analyses',
      method: 'Notre méthode',
      methodTitle: "Des conclusions traçables, pas des classements sortis d'un chapeau.",
      method1: 'Recouper les sources et dater chaque observation.',
      method2: 'Rendre les hypothèses, limites et méthodes de calcul visibles.',
      method3: "Transformer la donnée en décision concrète, contextualisée pour l'Afrique.",
      brief: 'Trigenys Brief',
      briefTitle: "Une analyse utile. Pas une avalanche d'e-mails.",
      briefText:
        'Recevez les nouveaux dossiers, comparatifs et notes de terrain. Fréquence maîtrisée, désinscription en un clic.',
      read: "Lire l'analyse",
      comingSoon: 'Bientôt',
      minutes: 'min',
      minutesReading: 'min de lecture',
      by: '',
    },
    pillars: {
      technology: {
        title: 'Technologie',
        description:
          "Les infrastructures, l'IA et la cybersécurité qui reconfigurent les économies africaines.",
      },
      business: {
        title: 'Business',
        description:
          "Marchés, modèles économiques et stratégies d'entreprise analysés sans poudre aux yeux.",
      },
      systems: {
        title: "Systèmes d'information",
        description:
          'Architecture, données, cloud et logiciels vus depuis les réalités opérationnelles du continent.',
      },
      africa: {
        title: 'Afrique',
        description:
          "Les décisions publiques, dynamiques sociales et signaux faibles qui dessinent l'Afrique de demain.",
      },
    },
    archive: {
      eyebrow: 'La bibliothèque',
      title: 'Analyses',
      description: 'Recherche, comparaisons et retours de terrain pour décider avec plus de contexte.',
      none: 'Aucune analyse publiée pour le moment.',
      showing: 'Affichage',
      of: 'sur',
      posts: 'analyses',
    },
    search: {
      title: 'Recherche',
      placeholder: 'Rechercher',
      noResults: 'Aucun résultat trouvé.',
      description: 'Rechercher dans les analyses Trigenys Insights.',
    },
    post: {
      back: 'Retour aux articles',
      by: 'Par',
      sourcesTitle: 'Sources et méthode',
      sourcesText:
        "Les faits susceptibles d'évoluer ont été revérifiés dans les sources ci-dessous. Les observations et interprétations sont présentées comme telles dans l'article.",
      minutesReading: 'min de lecture',
    },
    newsletter: {
      placeholder: 'vous@entreprise.com',
      submit: "S'inscrire",
      loading: 'Inscription…',
      success: 'Inscription confirmée. La prochaine analyse arrive dans votre boîte mail.',
      error: "Impossible de vous inscrire pour le moment. Réessayez dans quelques instants.",
    },
  },
  en: {
    header: {
      tech: 'Tech',
      business: 'Business',
      systems: 'Information Systems',
      africa: 'Africa',
      methodology: 'Methodology',
      brief: 'The Brief',
      navLabel: 'Main navigation',
    },
    footer: {
      tagline: 'Research for better decisions.',
      explore: 'Explore',
      analyses: 'Analysis',
      methodology: 'Methodology',
      newsletter: 'Newsletter',
      newsroom: 'Newsroom',
      place: 'Built in Douala. Designed to travel.',
    },
    home: {
      publication: 'Independent publication · Douala, Cameroon',
      titleLine1: 'Understand the systems.',
      titleLine2: 'Decide with clarity.',
      intro:
        'Trigenys Insights combines research, data and field experience to support decisions in technology, cybersecurity, business and digital transformation.',
      explore: 'Explore our areas of analysis',
      founderKicker: 'Founding dossier · In preparation',
      founderTitle: 'The first article is already in the newsroom.',
      founderText:
        'The editorial foundation is ready. Articles stay in draft until their figures, sources and examples are checked — the Publish button deserves some respect.',
      fields: 'Our areas of analysis',
      fieldsTitle: 'Four angles. One standard.',
      latest: 'Latest publications',
      latestTitle: 'Analysis worth reading now.',
      viewAll: 'View all analysis',
      method: 'Our method',
      methodTitle: 'Traceable conclusions, not rankings pulled out of a hat.',
      method1: 'Cross-check sources and date every observation.',
      method2: 'Make assumptions, limits and calculation methods visible.',
      method3: 'Turn data into concrete decisions grounded in African realities.',
      brief: 'Trigenys Brief',
      briefTitle: 'Useful analysis. Not an inbox avalanche.',
      briefText:
        'Get new dossiers, comparisons and field notes. Controlled frequency, one-click unsubscribe.',
      read: 'Read the analysis',
      comingSoon: 'Coming soon',
      minutes: 'min',
      minutesReading: 'min read',
      by: '',
    },
    pillars: {
      technology: {
        title: 'Technology',
        description:
          'Infrastructure, AI and cybersecurity reshaping African economies.',
      },
      business: {
        title: 'Business',
        description:
          'Markets, business models and corporate strategy analysed without the hype.',
      },
      systems: {
        title: 'Information Systems',
        description:
          'Architecture, data, cloud and software viewed through the continent’s operational realities.',
      },
      africa: {
        title: 'Africa',
        description:
          'Public decisions, social dynamics and weak signals shaping Africa’s next chapter.',
      },
    },
    archive: {
      eyebrow: 'The library',
      title: 'Analysis',
      description: 'Research, comparisons and field notes for decisions with more context.',
      none: 'No analysis published yet.',
      showing: 'Showing',
      of: 'of',
      posts: 'analysis',
    },
    search: {
      title: 'Search',
      placeholder: 'Search',
      noResults: 'No results found.',
      description: 'Search Trigenys Insights analysis.',
    },
    post: {
      back: 'Back to articles',
      by: 'By',
      sourcesTitle: 'Sources and method',
      sourcesText:
        'Facts that may change over time were checked against the sources below. Observations and interpretations are presented as such in the article.',
      minutesReading: 'min read',
    },
    newsletter: {
      placeholder: 'you@company.com',
      submit: 'Subscribe',
      loading: 'Subscribing…',
      success: 'Subscription confirmed. The next analysis will land in your inbox.',
      error: 'Unable to subscribe right now. Please try again in a moment.',
    },
  },
} as const

export function getMessages(locale: SiteLocale) {
  return messages[locale]
}
