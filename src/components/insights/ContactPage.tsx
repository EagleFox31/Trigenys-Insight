import Link from 'next/link'
import { FileCheck2, Github, Handshake, Search, ShieldCheck } from 'lucide-react'

import type { SiteLocale } from '@/i18n/config'
import { ContactForm } from './ContactForm'

const pageCopy = {
  fr: {
    eyebrow: 'Contact',
    title: 'Parlons des faits, des sources et des sujets qui comptent.',
    intro:
      'Une correction, un document primaire, un signal à investiguer, une demande presse ou un partenariat éditorial ? Écrivez-nous ici.',
    formEyebrow: 'Écrire à la rédaction',
    formTitle: 'Votre message',
    reasons: [
      {
        icon: 'correction',
        title: 'Corriger un fait',
        text: 'Signalez une information précise, indiquez la page concernée et, si possible, joignez une source vérifiable.',
      },
      {
        icon: 'source',
        title: 'Partager une source',
        text: 'Rapport, donnée publique, document technique ou publication institutionnelle peuvent alimenter une enquête.',
      },
      {
        icon: 'signal',
        title: 'Proposer un sujet',
        text: 'Un changement discret, une tendance locale ou une question mal couverte peut devenir un dossier.',
      },
      {
        icon: 'partnership',
        title: 'Presse et partenariat',
        text: 'Pour une interview, une collaboration éditoriale ou une demande institutionnelle, précisez le contexte et les délais.',
      },
    ],
    publicIssues: 'Problème technique public ?',
    publicIssuesText:
      'Les bugs du site et demandes techniques non confidentielles peuvent aussi être signalés sur GitHub.',
    github: 'Ouvrir les issues GitHub',
    privacyTitle: 'Ce formulaire n’est pas un coffre-fort.',
    privacyText:
      'N’envoyez pas de mots de passe, données bancaires, pièces d’identité ou documents confidentiels. Pour une source sensible, commencez par décrire le sujet sans joindre le document.',
    location: 'Trigenys Insights est édité depuis Douala, Cameroun.',
  },
  en: {
    eyebrow: 'Contact',
    title: 'Talk to us about facts, sources and stories that matter.',
    intro:
      'A correction, primary document, story signal, press request or editorial partnership? Send it here.',
    formEyebrow: 'Write to the newsroom',
    formTitle: 'Your message',
    reasons: [
      {
        icon: 'correction',
        title: 'Correct a fact',
        text: 'Flag a specific statement, identify the relevant page and add a verifiable source when possible.',
      },
      {
        icon: 'source',
        title: 'Share a source',
        text: 'Reports, public data, technical documents and institutional publications can support future research.',
      },
      {
        icon: 'signal',
        title: 'Pitch a story',
        text: 'A quiet shift, local trend or underexplored question may be worth a full investigation.',
      },
      {
        icon: 'partnership',
        title: 'Press and partnerships',
        text: 'For interviews, editorial collaborations or institutional requests, include context and timing.',
      },
    ],
    publicIssues: 'Public technical issue?',
    publicIssuesText:
      'Site bugs and non-confidential technical requests can also be reported through GitHub.',
    github: 'Open GitHub issues',
    privacyTitle: 'This form is not a secure vault.',
    privacyText:
      'Do not send passwords, banking information, identity documents or confidential files. For a sensitive source, describe the topic first without attaching the document.',
    location: 'Trigenys Insights is edited from Douala, Cameroon.',
  },
} as const

const iconByKind = {
  correction: FileCheck2,
  source: ShieldCheck,
  signal: Search,
  partnership: Handshake,
} as const

export function ContactPage({ locale }: { locale: SiteLocale }) {
  const t = pageCopy[locale]

  return (
    <main className="pb-20 pt-16 md:pb-28 md:pt-24">
      <section className="insights-shell">
        <div className="max-w-[980px]">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="mt-4 max-w-[900px] font-[var(--font-fraunces)] text-[clamp(2.8rem,7vw,6.5rem)] font-semibold leading-[0.94] tracking-[-0.05em] text-[#102f52]">
            {t.title}
          </h1>
          <p className="mt-7 max-w-[68ch] text-lg leading-8 text-[#59636b]">{t.intro}</p>
          <p className="mt-4 text-sm font-medium text-[#7b6a57]">{t.location}</p>
        </div>
      </section>

      <section className="insights-shell mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {t.reasons.map((reason) => {
          const Icon = iconByKind[reason.icon]

          return (
            <article
              className="rounded-xl border border-[#dfded7] bg-[#fafaf7] p-6 shadow-[0_12px_35px_rgba(16,47,82,0.04)]"
              key={reason.title}
            >
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#102f52] text-white">
                <Icon aria-hidden="true" size={18} />
              </div>
              <h2 className="font-[var(--font-fraunces)] text-2xl font-semibold leading-tight text-[#102f52]">
                {reason.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#59636b]">{reason.text}</p>
            </article>
          )
        })}
      </section>

      <section className="insights-shell mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="rounded-xl border border-[#dfded7] bg-[#fff] p-6 shadow-[0_18px_55px_rgba(16,47,82,0.06)] md:p-9">
          <p className="eyebrow">{t.formEyebrow}</p>
          <h2 className="mt-3 font-[var(--font-fraunces)] text-4xl font-semibold text-[#102f52]">
            {t.formTitle}
          </h2>
          <div className="mt-8">
            <ContactForm locale={locale} />
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl bg-[#102f52] p-7 text-white">
            <ShieldCheck aria-hidden="true" className="mb-5 text-[#f0a257]" size={24} />
            <h2 className="font-[var(--font-fraunces)] text-2xl font-semibold">
              {t.privacyTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/75">{t.privacyText}</p>
          </div>

          <div className="rounded-xl border border-[#dfded7] bg-[#fafaf7] p-7">
            <Github aria-hidden="true" className="mb-5 text-[#102f52]" size={24} />
            <h2 className="font-[var(--font-fraunces)] text-2xl font-semibold text-[#102f52]">
              {t.publicIssues}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#59636b]">{t.publicIssuesText}</p>
            <Link
              className="mt-5 inline-flex border-b border-[#e07520] pb-1 font-semibold text-[#102f52]"
              href="https://github.com/EagleFox31/Trigenys-Insight/issues"
              rel="noreferrer"
              target="_blank"
            >
              {t.github}
            </Link>
          </div>
        </aside>
      </section>
    </main>
  )
}
