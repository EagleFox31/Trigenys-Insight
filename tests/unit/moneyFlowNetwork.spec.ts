import { describe, expect, it } from 'vitest'
import {
  buildNetworkEdges,
  connectNodes,
  GRAPH,
  networkNodes,
  nodeCenter,
} from '@/blocks/MoneyFlow/networkLayout'
import {
  goalChoices,
  originChoices,
  resolveJourney,
  walletChoices,
} from '@/blocks/MoneyFlow/journeyData'

describe('money-flow interactive network topology', () => {
  it('draws every candidate edge in a real network, not two disconnected stubs', () => {
    const edges = buildNetworkEdges({ origin: 'france', wallet: 'orange', goal: 'school' })
    expect(networkNodes).toHaveLength(10)
    expect(edges).toHaveLength(24)
    expect(edges.filter((edge) => edge.kind === 'incoming')).toHaveLength(8)
    expect(edges.filter((edge) => edge.kind === 'outgoing')).toHaveLength(16)
    expect(edges.filter((edge) => edge.selected).map((edge) => edge.key)).toEqual([
      'in:france:orange',
      'out:orange:school',
    ])
    expect(new Set(edges.map((edge) => edge.key)).size).toBe(24)
  })

  it('anchors every link on the actual edge of its nodes, with room to see the curve', () => {
    const source = networkNodes.find((node) => node.column === 'origin' && node.key === 'france')!
    const target = networkNodes.find((node) => node.column === 'wallet' && node.key === 'orange')!
    const path = connectNodes(source, target)
    const fromY = source.y + GRAPH.nodeHeight / 2
    const toY = target.y + GRAPH.nodeHeight / 2
    expect(path.startsWith('M ' + (source.x + GRAPH.nodeWidth) + ' ' + fromY)).toBe(true)
    expect(path.endsWith(target.x + ' ' + toY)).toBe(true)
    expect(target.x - source.x - GRAPH.nodeWidth).toBeGreaterThan(150)
  })

  it('stays within the 1120 x 515 drawing surface', () => {
    for (const node of networkNodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.x + GRAPH.nodeWidth).toBeLessThanOrEqual(GRAPH.width)
      expect(node.y + GRAPH.nodeHeight).toBeLessThanOrEqual(GRAPH.height)
      expect(nodeCenter(node).x).toBeGreaterThan(node.x)
    }
  })

  it('changes exactly two highlighted edges for each of the 32 possible selections', () => {
    for (const origin of originChoices) {
      for (const wallet of walletChoices) {
        for (const goal of goalChoices) {
          const edges = buildNetworkEdges({ origin, wallet, goal })
          const active = edges.filter((edge) => edge.selected)
          const actual = resolveJourney(origin, wallet, goal)
          expect(active).toHaveLength(2)
          expect(active[0].status).toBe(actual.incoming.status)
          expect(active[1].status).toBe(actual.outgoing.status)
          expect(active.map((edge) => edge.key)).toEqual([
            'in:' + origin + ':' + wallet, 'out:' + wallet + ':' + goal,
          ])
        }
      }
    }
  })

  it('keeps crypto paths unknown rather than presenting them as confirmed payment rails', () => {
    for (const wallet of walletChoices) {
      const edge = buildNetworkEdges({ origin: 'france', wallet, goal: 'crypto' })
        .find((item) => item.key === 'out:' + wallet + ':crypto')
      expect(edge?.status).toBe('unknown')
    }
  })
})
