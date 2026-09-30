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
      src: '/editorial/internet-cameroon/hero.png',
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
        src: '/editorial/internet-cameroon/routes.png',
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
        src: '/editorial/internet-cameroon/ixp.png',
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
        src: '/editorial/internet-cameroon/cable.png',
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
}

export function getEditorialVisuals(slug?: string | null) {
  if (!slug) return null
  return editorialVisuals[slug] || null
}

export function localizedEditorialText(text: LocalizedText, locale: SiteLocale) {
  return text[locale]
}
