import type { SiteLocale } from '@/i18n/config'

type LocalizedText = {
  fr: string
  en: string
}

type EditorialSectionVisual = {
  heading: LocalizedText
  src: string
  alt: LocalizedText
  caption: LocalizedText
}

type EditorialVisualSet = {
  hero: {
    src: string
    alt: LocalizedText
  }
  sections: EditorialSectionVisual[]
}

const editorialVisuals: Record<string, EditorialVisualSet> = {
  'internet-cameroun-ou-partent-nos-donnees': {
    hero: {
      src: '/editorial/internet-cameroon/hero.webp',
      alt: {
        fr: 'Illustration éditoriale réaliste d’une grande ville portuaire camerounaise reliée par des flux de données.',
        en: 'Realistic editorial illustration of a major Cameroonian port city connected by data flows.',
      },
    },
    sections: [
      {
        heading: {
          fr: 'Internet ressemble plus à un réseau de compagnies de transport qu’à une seule autoroute',
          en: 'The Internet looks more like a network of transport companies than one giant highway',
        },
        src: '/editorial/internet-cameroon/routes.webp',
        alt: {
          fr: 'Centre de supervision montrant plusieurs routes numériques entre l’Afrique et le reste du monde.',
          en: 'Network operations centre showing several digital routes between Africa and the rest of the world.',
        },
        caption: {
          fr: 'Illustration éditoriale. Sur Internet, plusieurs chemins peuvent relier un réseau à une même destination.',
          en: 'Editorial illustration. On the Internet, several paths can connect a network to the same destination.',
        },
      },
      {
        heading: {
          fr: 'Un IXP ressemble à un grand marché où les réseaux viennent se rencontrer',
          en: 'An IXP is like a large market where networks meet',
        },
        src: '/editorial/internet-cameroon/ixp.webp',
        alt: {
          fr: 'Techniciens travaillant sur des équipements réseau et des connexions fibre dans un centre de données.',
          en: 'Technicians working on network equipment and fibre connections inside a data centre.',
        },
        caption: {
          fr: 'Illustration éditoriale. Un point d’échange permet à plusieurs réseaux de se connecter au même endroit.',
          en: 'Editorial illustration. An exchange point allows several networks to interconnect in the same place.',
        },
      },
      {
        heading: {
          fr: 'Pourquoi la distance compte encore, même sur Internet',
          en: 'Distance still matters on the Internet',
        },
        src: '/editorial/internet-cameroon/cable.webp',
        alt: {
          fr: 'Techniciens installant un câble de télécommunications sous-marin sur une côte africaine.',
          en: 'Technicians installing a submarine telecommunications cable on an African coast.',
        },
        caption: {
          fr: 'Illustration éditoriale. Les données internationales dépendent aussi d’infrastructures physiques comme les câbles sous-marins.',
          en: 'Editorial illustration. International data also depends on physical infrastructure such as submarine cables.',
        },
      },
    ],
  },
  'ia-afrique-peut-elle-vraiment-decider': {
    hero: {
      src: '/editorial/africa-ai-governance/hero.webp',
      alt: {
        fr: 'Décideuse africaine observant une carte numérique de l’Afrique et ses réseaux technologiques.',
        en: 'African decision-maker looking at a digital map of Africa and its technology networks.',
      },
    },
    sections: [
      {
        heading: {
          fr: 'Avant de parler de souveraineté, il faut découper l’IA en morceaux',
          en: 'AI is a chain, not one product',
        },
        src: '/editorial/africa-ai-governance/industry.webp',
        alt: {
          fr: 'Ingénieurs africains utilisant des outils numériques dans une usine automobile moderne.',
          en: 'African engineers using digital tools inside a modern automotive factory.',
        },
        caption: {
          fr: 'Illustration éditoriale. L’IA ne se limite pas aux modèles : sa valeur dépend aussi des usages, des compétences et des infrastructures qui l’entourent.',
          en: 'Editorial illustration. AI is not only about models: its value also depends on applications, skills and the infrastructure around them.',
        },
      },
      {
        heading: {
          fr: 'Réguler, c’est fixer les règles du terrain',
          en: 'Regulation sets the rules of the field',
        },
        src: '/editorial/africa-ai-governance/governance.webp',
        alt: {
          fr: 'Réunion internationale consacrée à la gouvernance numérique et à la place de l’Afrique dans les décisions technologiques.',
          en: 'International meeting on digital governance and Africa’s place in technology decision-making.',
        },
        caption: {
          fr: 'Illustration éditoriale. Les règles peuvent donner du pouvoir, mais leur portée dépend aussi du poids économique et technologique de ceux qui les fixent.',
          en: 'Editorial illustration. Rules can create leverage, but their reach also depends on the economic and technological weight behind them.',
        },
      },
      {
        heading: {
          fr: 'Les infrastructures donnent du poids aux règles',
          en: 'Infrastructure gives rules more weight',
        },
        src: '/editorial/africa-ai-governance/compute.webp',
        alt: {
          fr: 'Équipe technique africaine travaillant dans un centre de données moderne.',
          en: 'African technical team working inside a modern data centre.',
        },
        caption: {
          fr: 'Illustration éditoriale. Sans capacité de calcul, d’hébergement et d’exploitation, une politique d’IA reste dépendante d’infrastructures contrôlées ailleurs.',
          en: 'Editorial illustration. Without compute, hosting and operational capacity, AI policy remains dependent on infrastructure controlled elsewhere.',
        },
      },
    ],
  }
}

export function getEditorialVisuals(slug?: string | null) {
  if (!slug) return null
  return editorialVisuals[slug] || null
}

export function localizedEditorialText(text: LocalizedText, locale: SiteLocale) {
  return text[locale]
}
