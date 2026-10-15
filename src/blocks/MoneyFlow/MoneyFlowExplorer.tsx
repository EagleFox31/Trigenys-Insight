'use client'

import { useId, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Bitcoin,
  CircleHelp,
  Globe2,
  GraduationCap,
  Landmark,
  MapPin,
  RefreshCw,
  Send,
  ShoppingBasket,
  Smartphone,
  Wallet as WalletIcon,
} from 'lucide-react'

import {
  goalChoices,
  journeyCopy,
  journeySources,
  originChoices,
  resolveJourney,
  walletChoices,
  type EvidenceStatus,
  type Goal,
  type Origin,
  type Wallet,
} from './journeyData'
import { buildNetworkEdges, GRAPH, networkNodes, type NetworkNode } from './networkLayout'

type Props = { title?: string; description?: string }
type Language = 'fr' | 'en'

const palette: Record<EvidenceStatus, { stroke: string; pill: string; dot: string }> = {
  documented: {
    stroke: '#087b58',
    pill: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
    dot: 'bg-emerald-600',
  },
  conditional: {
    stroke: '#bb812c',
    pill: 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200',
    dot: 'bg-amber-500',
  },
  unknown: {
    stroke: '#969ead',
    pill: 'border-border bg-muted text-foreground',
    dot: 'bg-slate-400',
  },
}

const nodeIcons = {
  france: Globe2,
  cameroon: MapPin,
  orange: WalletIcon,
  mtn: Smartphone,
  bank: Landmark,
  cash: Banknote,
  school: GraduationCap,
  shopping: ShoppingBasket,
  international: Send,
  crypto: Bitcoin,
}

/**
 * Images bundled with the site, rather than remote image hotlinks.
 * Orange/MoMo are editorial identifiers, not official trademark logo reproductions.
 */
export const nodeImages: Record<Origin | Wallet | Goal, string> = {
  france: '/money-flow/france.svg',
  cameroon: '/money-flow/cameroon.svg',
  orange: '/money-flow/orange.svg',
  mtn: '/money-flow/mtn.svg',
  bank: '/money-flow/bank.svg',
  cash: '/money-flow/cash.svg',
  school: '/money-flow/school.svg',
  shopping: '/money-flow/shopping.svg',
  international: '/money-flow/international.svg',
  crypto: '/money-flow/crypto.svg',
}

function NodeImage({ name }: { name: Origin | Wallet | Goal }) {
  const [failed, setFailed] = useState(false)
  const Icon = nodeIcons[name]
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-black/5 bg-white text-slate-800" aria-hidden="true">
      {failed ? (
        <Icon size={22} aria-hidden="true" />
      ) : (
        <Image
          src={nodeImages[name]}
          alt=""
          width={44}
          height={44}
          unoptimized
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}

const subtitles: Record<Language, Record<Origin | Wallet | Goal, string>> = {
  fr: {
    france: 'Diaspora', cameroon: 'Circuit national', orange: 'Portefeuille mobile',
    mtn: 'Portefeuille mobile', bank: 'Compte bancaire', cash: 'Retrait ou dépôt',
    school: 'Établissement éligible', shopping: 'Commerçant partenaire',
    international: 'Couloir transfrontalier', crypto: 'Statut à vérifier',
  },
  en: {
    france: 'Diaspora transfer', cameroon: 'Domestic route', orange: 'Mobile wallet',
    mtn: 'Mobile wallet', bank: 'Bank account', cash: 'Cash pickup / deposit',
    school: 'Eligible school', shopping: 'Participating merchant',
    international: 'Cross-border route', crypto: 'Regulatory review',
  },
}

const scenarios: { id: string; origin: Origin; wallet: Wallet; goal: Goal; fr: string; en: string }[] = [
  { id: 'fees', origin: 'france', wallet: 'orange', goal: 'school', fr: 'Recevoir et payer l’école', en: 'Receive and pay school fees' },
  { id: 'shops', origin: 'cameroon', wallet: 'mtn', goal: 'shopping', fr: 'Payer ses achats', en: 'Pay at a shop' },
  { id: 'cross-border', origin: 'cameroon', wallet: 'bank', goal: 'international', fr: 'Envoyer à l’étranger', en: 'Send money abroad' },
]

function StatusPill({ status, locale }: { status: EvidenceStatus; locale: Language }) {
  return (
    <span className={'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ' + palette[status].pill}>
      <span className={'h-1.5 w-1.5 rounded-full ' + palette[status].dot} aria-hidden="true" />
      {journeyCopy[locale].status[status]}
    </span>
  )
}

function nodeLabel(node: NetworkNode, locale: Language): string {
  const copy = journeyCopy[locale]
  if (node.column === 'origin') return copy.origins[node.key]
  if (node.column === 'wallet') return copy.wallets[node.key]
  return copy.goals[node.key]
}

function NetworkCanvas({
  origin, wallet, goal, setOrigin, setWallet, setGoal, locale, labelId,
}: {
  origin: Origin
  wallet: Wallet
  goal: Goal
  setOrigin: (next: Origin) => void
  setWallet: (next: Wallet) => void
  setGoal: (next: Goal) => void
  locale: Language
  labelId: string
}) {
  const edges = useMemo(() => buildNetworkEdges({ origin, wallet, goal }), [origin, wallet, goal])
  const selectedJourney = resolveJourney(origin, wallet, goal)
  const cols = journeyCopy[locale].stages
  const order = [...edges.filter((edge) => !edge.selected), ...edges.filter((edge) => edge.selected)]

  return (
    <div
      className="relative h-[515px] min-w-[790px] w-full select-none overflow-hidden bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100"
      role="group"
      aria-labelledby={labelId}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-45 dark:opacity-25"
        style={{ backgroundImage: 'radial-gradient(#899a9a 0.7px, transparent 0.7px)', backgroundSize: '22px 22px' }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-y-0 left-[34%] w-px bg-slate-200/70 dark:bg-zinc-800" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 left-[70%] w-px bg-slate-200/70 dark:bg-zinc-800" aria-hidden="true" />
      {cols.map((label, i) => (
        <div
          key={label}
          className="absolute top-5 z-10 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400"
          style={{ left: ([46, 452, 854][i] / GRAPH.width * 100) + '%' }}
        >
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
            {i + 1}
          </span>
          {label}
        </div>
      ))}

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={'0 0 ' + GRAPH.width + ' ' + GRAPH.height}
        preserveAspectRatio="none"
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <filter id="money-flow-active-glow" x="-25%" y="-200%" width="150%" height="500%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        {order.map((edge) => {
          const color = palette[edge.status].stroke
          return (
            <g key={edge.key}>
              {edge.selected && (
                <path d={edge.path} fill="none" stroke={color} strokeWidth="15" strokeOpacity=".19" filter="url(#money-flow-active-glow)" />
              )}
              <path
                d={edge.path}
                fill="none"
                stroke={color}
                strokeWidth={edge.selected ? 5 : 1.9}
                strokeOpacity={edge.selected ? 1 : edge.status === 'unknown' ? 0.10 : 0.19}
                strokeDasharray={edge.status === 'unknown' ? '7 7' : undefined}
                strokeLinecap="round"
                className="transition-[stroke,stroke-opacity,stroke-width] duration-300 motion-reduce:transition-none"
              />
            </g>
          )
        })}
      </svg>

      {networkNodes.map((node) => {
        const active = node.column === 'origin'
          ? origin === node.key
          : node.column === 'wallet'
            ? wallet === node.key
            : goal === node.key
        const status = node.column === 'origin'
          ? selectedJourney.incoming.status
          : node.column === 'wallet'
            ? selectedJourney.incoming.status
            : selectedJourney.outgoing.status
        const label = nodeLabel(node, locale)
        const category = cols[node.column === 'origin' ? 0 : node.column === 'wallet' ? 1 : 2]

        function select() {
          if (node.column === 'origin') setOrigin(node.key)
          else if (node.column === 'wallet') setWallet(node.key)
          else setGoal(node.key)
        }

        return (
          <button
            key={node.column + ':' + node.key}
            type="button"
            aria-pressed={active}
            aria-label={category + ' : ' + label + (active ? (locale === 'fr' ? ', sélectionné' : ', selected') : '')}
            onClick={select}
            style={{
              left: (node.x / GRAPH.width * 100) + '%',
              top: node.y + 'px',
              width: (GRAPH.nodeWidth / GRAPH.width * 100) + '%',
              height: GRAPH.nodeHeight + 'px',
            }}
            className={'absolute z-20 flex items-center gap-2.5 rounded-2xl border px-3 text-left shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 motion-reduce:transition-none ' + (
              active
                ? 'scale-[1.025] border-emerald-600 bg-emerald-800 text-white shadow-[0_8px_28px_-8px_rgba(6,95,70,0.45)] dark:bg-emerald-700'
                : 'border-slate-200 bg-white/95 text-slate-900 hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50'
            )}
          >
            <NodeImage name={node.key} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold leading-5">{label}</span>
              <span className={'mt-0.5 block text-[10px] leading-3.5 ' + (active ? 'text-emerald-50/80' : 'text-slate-500 dark:text-zinc-400')}>
                {subtitles[locale][node.key]}
              </span>
            </span>
            {active && <span className="h-2 w-2 shrink-0 rounded-full bg-lime-300" aria-hidden="true" />}
          </button>
        )
      })}
      <div className="pointer-events-none absolute bottom-3 left-5 text-[10px] font-medium text-slate-500 dark:text-zinc-400" aria-hidden="true">
        {locale === 'fr' ? 'Liaisons explorables · pas de volumes simulés' : 'Browsable links · no invented volumes'}
      </div>
    </div>
  )
}

/**
 * An explorable network, NOT a Sankey: edge thickness never means money volume.
 * Real SVG edges span the full distance between nodes. Buttons remain native
 * keyboard/touch targets; the path graphic is decorative, text explains evidence.
 */
export function MoneyFlowExplorer({ title, description }: Props) {
  const pathname = usePathname()
  const locale: Language = pathname.startsWith('/en/') || pathname === '/en' ? 'en' : 'fr'
  const copy = journeyCopy[locale]
  const id = useId()
  const [origin, setOrigin] = useState<Origin>('france')
  const [wallet, setWallet] = useState<Wallet>('orange')
  const [goal, setGoal] = useState<Goal>('school')
  const result = resolveJourney(origin, wallet, goal)
  const sources = [...new Set([...result.incoming.sources, ...result.outgoing.sources])]
  const selectedLabels = [copy.origins[origin], copy.wallets[wallet], copy.goals[goal]]

  const reset = () => {
    setOrigin('france')
    setWallet('orange')
    setGoal('school')
  }

  return (
    <section
      aria-labelledby={id + '-title'}
      className="not-prose relative left-1/2 my-10 w-[min(1180px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-[0_18px_65px_-35px_rgba(15,23,42,0.4)]"
    >
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-[#102f31] px-5 py-7 text-white sm:px-8 sm:py-9">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.2em] text-emerald-200">
          Trigenys Insight <span className="mx-2 opacity-50">/</span> Data Stories
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h3 id={id + '-title'} className="m-0 text-balance text-2xl font-bold leading-snug sm:text-3xl">
              {title || (locale === 'fr' ? 'Où peut aller mon argent ?' : 'Where can my money go?')}
            </h3>
            <p className="m-0 mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85 sm:text-base">
              {description || copy.intro}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <RefreshCw size={15} aria-hidden="true" />
            {copy.reset}
          </button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2" aria-label={locale === 'fr' ? 'Parcours rapides' : 'Quick journeys'}>
          {scenarios.map((scenario) => {
            const active = origin === scenario.origin && wallet === scenario.wallet && goal === scenario.goal
            return (
              <button
                type="button"
                key={scenario.id}
                aria-pressed={active}
                onClick={() => { setOrigin(scenario.origin); setWallet(scenario.wallet); setGoal(scenario.goal) }}
                className={'min-h-9 rounded-full border px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ' + (
                  active ? 'border-lime-300 bg-lime-200 text-emerald-950' : 'border-emerald-200/35 bg-emerald-950/20 text-emerald-50 hover:bg-white/15'
                )}
              >
                {scenario[locale]} <ArrowUpRight className="ml-1 inline-block" size={13} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-3 pb-6 pt-5 sm:px-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {(['documented', 'conditional', 'unknown'] as const).map((status) => (
              <span className="inline-flex items-center gap-2 text-muted-foreground" key={status}>
                <span className={'h-2.5 w-2.5 rounded-full ' + palette[status].dot} aria-hidden="true" />
                {copy.status[status]}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-2 font-medium text-muted-foreground">
            <CircleHelp size={14} aria-hidden="true" />
            {locale === 'fr' ? 'Touchez un nœud pour changer le trajet' : 'Choose any node to change the route'}
          </span>
        </div>

        <p id={id + '-graph-title'} className="sr-only">
          {locale === 'fr'
            ? 'Graphe de parcours : choisissez un pays, un moyen de réception, puis un usage. Les courbes relient les options disponibles à explorer, sans garantir les transactions.'
            : 'Journey network: choose a country, a payment receipt method and a goal. Curved links are options to investigate, not guaranteed payments.'}
        </p>

        <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-border shadow-inner" tabIndex={0} aria-label={locale === 'fr' ? 'Diagramme des parcours, défilement horizontal sur petit écran' : 'Payment network, horizontally scrollable on small screens'}>
          <NetworkCanvas
            origin={origin}
            wallet={wallet}
            goal={goal}
            setOrigin={setOrigin}
            setWallet={setWallet}
            setGoal={setGoal}
            locale={locale}
            labelId={id + '-graph-title'}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground md:hidden">
          {locale === 'fr' ? 'Sur téléphone : faites glisser le graphe horizontalement pour explorer tous les nœuds.' : 'On mobile: swipe horizontally to explore every node.'}
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-background p-4 sm:p-6" aria-live="polite" aria-atomic="true">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {locale === 'fr' ? 'Parcours sélectionné' : 'Selected journey'}
              </p>
              <h4 className="m-0 mt-1 text-base font-bold sm:text-lg">{copy.title}</h4>
            </div>
            <StatusPill status={result.overall} locale={locale} />
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
            {selectedLabels.map((label, index) => (
              <span key={label + index} className="inline-flex items-center gap-2">
                {index > 0 && <ArrowRight size={15} className="text-emerald-700 dark:text-emerald-400" aria-hidden="true" />}
                <span className="rounded-lg border border-border bg-muted/65 px-3 py-2">{label}</span>
              </span>
            ))}
          </div>

          <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
            {[
              { stage: result.incoming, title: copy.step1 },
              { stage: result.outgoing, title: copy.step2 },
            ].map(({ stage, title: stageTitle }) => (
              <li key={stageTitle} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <strong className="text-sm">{stageTitle}</strong>
                  <StatusPill status={stage.status} locale={locale} />
                </div>
                <p className="m-0 text-sm leading-6 text-foreground">{stage.note[locale]}</p>
              </li>
            ))}
          </ol>

          {sources.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="m-0 mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{copy.sources}</p>
              <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
                {sources.map((key) => (
                  <li key={key}>
                    <a
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-emerald-700 underline underline-offset-4 hover:border-emerald-600 dark:text-emerald-300"
                      href={journeySources[key].href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {journeySources[key].label} <ArrowUpRight size={13} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <p className="m-0 mt-4 text-xs leading-5 text-muted-foreground">{copy.footnote}</p>
      </div>
    </section>
  )
}
