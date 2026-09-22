import type { Metadata } from 'next'
import Link from 'next/link'

import type { SiteLocale } from '@/i18n/config'
import { absoluteCanonicalURL } from '@/seo/structuredData'

export type PublisherInfoKind = 'about' | 'editorial-policy' | 'methodology' | 'contact'

const routeByKind: Record<PublisherInfoKind, string> = {
  about: 'about',
  'editorial-policy': 'editorial-policy',
  methodology: 'methodology',
  contact: 'contact',
}

const contentByLocale = {
  fr: {
    about: {
      eyebrow: 'À propos',
      title: 'Une publication indépendante née à Douala.',
      intro:
        "Trigenys Insights analyse la technologie, le business, les systèmes d'information et les transformations africaines avec une exigence simple : relier les faits, les données et le contexte avant de conclure.",
      sections: [
        {
          title: 'Ce que nous couvrons',
          paragraphs: [
            "Technologie : ce qui se construit, se déploie et change réellement les usages.",
            "Business : où circule la valeur, comment les modèles économiques tiennent et où se trouvent les contraintes.",
            "Systèmes d'information : comment les organisations font fonctionner données, logiciels, cloud, cybersécurité et opérations.",
            "Afrique : ce que ces transformations signifient à l'échelle des économies, des institutions et des sociétés du continent.",
          ],
        },
        {
          title: 'Notre positionnement',
          paragraphs: [
            "Nous ne cherchons pas à reproduire le fil d'actualité. Nous revenons sur les signaux qui méritent du contexte, des chiffres, une lecture technique ou économique et des questions utiles pour la décision.",
            "La publication est conçue à Douala, au Cameroun, avec une attention particulière aux réalités camerounaises et africaines.",
          ],
        },
        {
          title: 'Qui publie',
          paragraphs: [
            "Trigenys Insights est la publication éditoriale de l'équipe Trigenys. Les articles identifient leurs auteurs lorsqu'une signature publique est disponible.",
          ],
        },
      ],
    },
    'editorial-policy': {
      eyebrow: 'Confiance',
      title: 'Politique éditoriale',
      intro:
        "Notre crédibilité dépend moins de la vitesse que de notre capacité à montrer d'où viennent les faits, ce qui relève de l'analyse et ce qui reste incertain.",
      sections: [
        {
          title: 'Sources et vérification',
          paragraphs: [
            "Nous privilégions les sources primaires et officielles lorsqu'elles existent, puis les sources secondaires reconnues pour compléter ou recouper.",
            "Les informations susceptibles d'évoluer sont datées et revérifiées avant publication. Les sources utilisées dans les dossiers sont rendues visibles autant que possible.",
          ],
        },
        {
          title: 'Faits, estimations et interprétations',
          paragraphs: [
            "Un fait documenté, une estimation, une hypothèse et une interprétation éditoriale ne sont pas présentés comme s'ils avaient le même niveau de certitude.",
            "Les comparatifs expliquent leurs critères et leur contexte. Nous évitons de fabriquer un « gagnant » global lorsque les données ne le justifient pas.",
          ],
        },
        {
          title: 'Corrections et mises à jour',
          paragraphs: [
            "Lorsqu'une erreur factuelle est identifiée, nous la corrigeons. Une modification importante peut être signalée par une date de mise à jour visible sur l'article.",
            "Les demandes de correction peuvent être transmises via notre page Contact avec les éléments permettant de vérifier le point contesté.",
          ],
        },
        {
          title: 'Indépendance et contenus commerciaux',
          paragraphs: [
            "Un contenu sponsorisé, partenaire ou commercial doit être identifié comme tel. Une relation commerciale ne doit pas être présentée comme une validation éditoriale indépendante.",
          ],
        },
        {
          title: "Usage d'outils d'IA",
          paragraphs: [
            "Des outils logiciels et d'intelligence artificielle peuvent assister la recherche, l'organisation, l'analyse ou la production. Ils ne remplacent pas l'exigence de sources vérifiables et de responsabilité éditoriale sur ce qui est publié.",
          ],
        },
      ],
    },
    methodology: {
      eyebrow: 'Méthodologie',
      title: 'Comment nous travaillons',
      intro:
        "Une bonne analyse doit pouvoir être interrogée. Nous cherchons donc à rendre visibles les sources, les hypothèses, les limites et le contexte qui soutiennent nos conclusions.",
      sections: [
        {
          title: '1. Partir de la question, pas du récit',
          paragraphs: [
            "Nous formulons d'abord la question que les données doivent permettre d'éclairer. Un événement peut déclencher un dossier sans devenir, à lui seul, la preuve d'une tendance générale.",
          ],
        },
        {
          title: '2. Hiérarchiser les sources',
          paragraphs: [
            "Textes officiels, données publiques, rapports institutionnels, documents techniques, publications d'entreprise et travaux de recherche sont privilégiés selon le sujet. La presse et les témoignages servent à compléter le contexte et sont attribués.",
          ],
        },
        {
          title: '3. Contextualiser pour le Cameroun et l’Afrique',
          paragraphs: [
            "Une pratique courante ailleurs n'est pas automatiquement une recommandation pour Douala, Yaoundé ou une autre réalité africaine. Coût, infrastructures, réglementation, usages, énergie, connectivité et capacité opérationnelle font partie de l'analyse.",
          ],
        },
        {
          title: '4. Montrer ce que les données ne disent pas',
          paragraphs: [
            "L'absence de données, les écarts de méthodologie et les estimations sont signalés. Nous préférons laisser une question ouverte plutôt que transformer une lacune en certitude.",
          ],
        },
        {
          title: '5. Relier la donnée à la décision',
          paragraphs: [
            "La conclusion doit expliquer ce qui change concrètement, les indicateurs à surveiller et les prochaines questions à tester — pas seulement résumer ce qui vient d'être dit.",
          ],
        },
      ],
    },
    contact: {
      eyebrow: 'Contact',
      title: 'Nous contacter',
      intro:
        "Une correction, une source primaire, un signal à investiguer ou une question sur notre méthode ? Voici les canaux publics actuellement disponibles.",
      sections: [
        {
          title: 'Corrections et questions éditoriales',
          paragraphs: [
            "Pour signaler publiquement une erreur vérifiable ou un problème lié au site, vous pouvez utiliser le dépôt GitHub de Trigenys Insights. Évitez d'y publier des données personnelles ou des documents confidentiels.",
          ],
          links: [
            {
              label: 'Ouvrir les issues GitHub',
              href: 'https://github.com/EagleFox31/Trigenys-Insight/issues',
            },
          ],
        },
        {
          title: 'Trigenys',
          paragraphs: [
            "Pour les demandes générales concernant Trigenys, utilisez le site principal. Nous ajouterons ici un canal éditorial direct lorsqu'il sera officiellement disponible.",
          ],
          links: [{ label: 'trigenys.com', href: 'https://trigenys.com' }],
        },
      ],
    },
  },
  en: {
    about: {
      eyebrow: 'About',
      title: 'An independent publication built in Douala.',
      intro:
        'Trigenys Insights analyses technology, business, information systems and African transformation with a simple standard: connect facts, data and context before drawing conclusions.',
      sections: [
        {
          title: 'What we cover',
          paragraphs: [
            'Technology: what is being built, deployed and changing real-world use.',
            'Business: where value flows, how business models hold up and where constraints sit.',
            'Information Systems: how organisations operate data, software, cloud, cybersecurity and day-to-day systems.',
            'Africa: what these shifts mean for the continent’s economies, institutions and societies.',
          ],
        },
        {
          title: 'Our positioning',
          paragraphs: [
            'We are not trying to reproduce the breaking-news feed. We return to signals that deserve context, numbers, technical or economic analysis and decision-useful questions.',
            'The publication is built in Douala, Cameroon, with particular attention to Cameroonian and African realities.',
          ],
        },
        {
          title: 'Who publishes',
          paragraphs: [
            'Trigenys Insights is the editorial publication of the Trigenys team. Articles identify their authors when a public byline is available.',
          ],
        },
      ],
    },
    'editorial-policy': {
      eyebrow: 'Trust',
      title: 'Editorial policy',
      intro:
        'Our credibility depends less on speed than on showing where facts come from, what is analysis and what remains uncertain.',
      sections: [
        {
          title: 'Sources and verification',
          paragraphs: [
            'We prefer primary and official sources when they exist, then use recognised secondary sources to complement or cross-check the record.',
            'Time-sensitive information is dated and rechecked before publication. Sources used in dossiers are made visible whenever possible.',
          ],
        },
        {
          title: 'Facts, estimates and interpretation',
          paragraphs: [
            'A documented fact, an estimate, a hypothesis and an editorial interpretation are not presented as if they carried the same level of certainty.',
            'Comparisons explain their criteria and context. We avoid manufacturing an overall “winner” when the evidence does not justify one.',
          ],
        },
        {
          title: 'Corrections and updates',
          paragraphs: [
            'When a factual error is identified, we correct it. A material change may be reflected through a visible updated date on the article.',
            'Correction requests can be sent through our Contact page with enough evidence to verify the disputed point.',
          ],
        },
        {
          title: 'Independence and commercial content',
          paragraphs: [
            'Sponsored, partner or commercial content must be identified as such. A commercial relationship must not be presented as independent editorial validation.',
          ],
        },
        {
          title: 'Use of AI tools',
          paragraphs: [
            'Software and artificial-intelligence tools may assist research, organisation, analysis or production. They do not replace verifiable sourcing or editorial responsibility for what is published.',
          ],
        },
      ],
    },
    methodology: {
      eyebrow: 'Methodology',
      title: 'How we work',
      intro:
        'Good analysis should be open to scrutiny. We therefore try to make the sources, assumptions, limits and context behind our conclusions visible.',
      sections: [
        {
          title: '1. Start with the question, not the narrative',
          paragraphs: [
            'We first define the question the evidence should help answer. An event can trigger a dossier without becoming, on its own, proof of a wider trend.',
          ],
        },
        {
          title: '2. Rank sources by evidentiary value',
          paragraphs: [
            'Official texts, public data, institutional reports, technical documents, company publications and research are prioritised depending on the subject. News coverage and testimony complement the context and are attributed.',
          ],
        },
        {
          title: '3. Ground analysis in Cameroon and Africa',
          paragraphs: [
            'A common practice elsewhere is not automatically a recommendation for Douala, Yaoundé or another African context. Cost, infrastructure, regulation, usage, power, connectivity and operating capacity are part of the analysis.',
          ],
        },
        {
          title: '4. Show what the data cannot tell us',
          paragraphs: [
            'Missing data, methodological differences and estimates are flagged. We would rather leave a question open than turn a gap into certainty.',
          ],
        },
        {
          title: '5. Connect evidence to decisions',
          paragraphs: [
            'A conclusion should explain what changes in practice, which indicators deserve monitoring and what should be tested next — not simply repeat the article.',
          ],
        },
      ],
    },
    contact: {
      eyebrow: 'Contact',
      title: 'Contact Trigenys Insights',
      intro:
        'A correction, a primary source, a signal worth investigating or a question about our method? These are the public channels currently available.',
      sections: [
        {
          title: 'Corrections and editorial questions',
          paragraphs: [
            'To publicly report a verifiable error or a site issue, you can use the Trigenys Insights GitHub repository. Do not publish personal data or confidential documents there.',
          ],
          links: [
            {
              label: 'Open GitHub issues',
              href: 'https://github.com/EagleFox31/Trigenys-Insight/issues',
            },
          ],
        },
        {
          title: 'Trigenys',
          paragraphs: [
            'For general enquiries about Trigenys, use the main website. We will add a direct editorial contact channel here once one is officially available.',
          ],
          links: [{ label: 'trigenys.com', href: 'https://trigenys.com' }],
        },
      ],
    },
  },
} as const

export function publisherInfoMetadata(locale: SiteLocale, kind: PublisherInfoKind): Metadata {
  const page = contentByLocale[locale][kind]
  const path = `/${locale}/${routeByKind[kind]}`
  const otherLocale: SiteLocale = locale === 'fr' ? 'en' : 'fr'

  return {
    title: page.title,
    description: page.intro,
    alternates: {
      canonical: absoluteCanonicalURL(path),
      languages: {
        fr: absoluteCanonicalURL(`/fr/${routeByKind[kind]}`),
        en: absoluteCanonicalURL(`/en/${routeByKind[kind]}`),
        'x-default': absoluteCanonicalURL(`/fr/${routeByKind[kind]}`),
      },
    },
  }
}

export function PublisherInfoPage({
  locale,
  kind,
}: {
  locale: SiteLocale
  kind: PublisherInfoKind
}) {
  const page = contentByLocale[locale][kind]

  return (
    <main className="insights-shell py-16 md:py-24">
      <div className="mx-auto max-w-[880px]">
        <p className="eyebrow">{page.eyebrow}</p>
        <h1 className="mt-4 font-[var(--font-fraunces)] text-[clamp(2.6rem,6vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-[#102f52]">
          {page.title}
        </h1>
        <p className="mt-7 max-w-[68ch] text-lg leading-8 text-[#59636b]">{page.intro}</p>

        <div className="mt-14 space-y-12 border-t border-[#dfded7] pt-10">
          {page.sections.map((section) => (
            <section className="grid gap-5 md:grid-cols-[220px_1fr] md:gap-10" key={section.title}>
              <h2 className="font-[var(--font-fraunces)] text-2xl font-semibold leading-tight text-[#102f52]">
                {section.title}
              </h2>
              <div className="space-y-4 text-[16px] leading-7 text-[#3f4c56]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {'links' in section && section.links && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {section.links.map((link) => {
                      const external = link.href.startsWith('http')

                      return external ? (
                        <a
                          className="inline-flex items-center border-b border-[#e07520] pb-1 font-semibold text-[#102f52]"
                          href={link.href}
                          key={link.href}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          className="inline-flex items-center border-b border-[#e07520] pb-1 font-semibold text-[#102f52]"
                          href={link.href}
                          key={link.href}
                        >
                          {link.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
