import {
  goalChoices,
  originChoices,
  resolveJourney,
  walletChoices,
  type EvidenceStatus,
  type Goal,
  type Origin,
  type Wallet,
} from './journeyData'

/** Logical coordinates used by both SVG paths and clickable HTML nodes. */
export const GRAPH = { width: 1120, height: 515, nodeWidth: 220, nodeHeight: 76 } as const

export type NetworkNode =
  | { column: 'origin'; key: Origin; x: number; y: number }
  | { column: 'wallet'; key: Wallet; x: number; y: number }
  | { column: 'goal'; key: Goal; x: number; y: number }

export type NetworkEdge = {
  key: string
  path: string
  kind: 'incoming' | 'outgoing'
  status: EvidenceStatus
  selected: boolean
}

const originY = [156, 320]
const otherY = [72, 170, 268, 366]

export const networkNodes: NetworkNode[] = [
  ...originChoices.map((key, i): NetworkNode => ({ column: 'origin', key, x: 46, y: originY[i] })),
  ...walletChoices.map((key, i): NetworkNode => ({ column: 'wallet', key, x: 452, y: otherY[i] })),
  ...goalChoices.map((key, i): NetworkNode => ({ column: 'goal', key, x: 854, y: otherY[i] })),
]

export function connectNodes(
  source: Pick<NetworkNode, 'x' | 'y'>,
  target: Pick<NetworkNode, 'x' | 'y'>,
): string {
  const fromX = source.x + GRAPH.nodeWidth
  const toX = target.x
  const fromY = source.y + GRAPH.nodeHeight / 2
  const toY = target.y + GRAPH.nodeHeight / 2
  const bend = (toX - fromX) * 0.55
  return [
    'M', fromX, fromY,
    'C', fromX + bend, fromY,
    toX - bend, toY,
    toX, toY,
  ].join(' ')
}

/** Every visible arc is a source-backed or explicitly conditional candidate route. */
export function buildNetworkEdges(selected: {
  origin: Origin
  wallet: Wallet
  goal: Goal
}): NetworkEdge[] {
  const edges: NetworkEdge[] = []
  for (const origin of originChoices) {
    for (const wallet of walletChoices) {
      const from = networkNodes.find((node) => node.column === 'origin' && node.key === origin)!
      const to = networkNodes.find((node) => node.column === 'wallet' && node.key === wallet)!
      edges.push({
        key: 'in:' + origin + ':' + wallet,
        path: connectNodes(from, to),
        kind: 'incoming',
        status: resolveJourney(origin, wallet, 'shopping').incoming.status,
        selected: selected.origin === origin && selected.wallet === wallet,
      })
    }
  }
  for (const wallet of walletChoices) {
    for (const goal of goalChoices) {
      const from = networkNodes.find((node) => node.column === 'wallet' && node.key === wallet)!
      const to = networkNodes.find((node) => node.column === 'goal' && node.key === goal)!
      edges.push({
        key: 'out:' + wallet + ':' + goal,
        path: connectNodes(from, to),
        kind: 'outgoing',
        status: resolveJourney('cameroon', wallet, goal).outgoing.status,
        selected: selected.wallet === wallet && selected.goal === goal,
      })
    }
  }
  return edges
}

export function nodeCenter(node: NetworkNode): { x: number; y: number } {
  return { x: node.x + GRAPH.nodeWidth / 2, y: node.y + GRAPH.nodeHeight / 2 }
}
