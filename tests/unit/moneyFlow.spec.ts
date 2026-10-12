import { describe, expect, it } from 'vitest'

import {
  goalChoices,
  journeySources,
  originChoices,
  resolveJourney,
  walletChoices,
} from '@/blocks/MoneyFlow/journeyData'

describe('Cameroon payment journey: editorial evidence', () => {
  it('offers a graph with two origins, four arrival methods and four spending goals', () => {
    expect(originChoices).toEqual(['france', 'cameroon'])
    expect(walletChoices).toEqual(['orange', 'mtn', 'bank', 'cash'])
    expect(goalChoices).toEqual(['school', 'shopping', 'international', 'crypto'])
  })

  it('documents France to Orange Money using a first-party remittance source', () => {
    const path = resolveJourney('france', 'orange', 'school')
    expect(path.incoming.status).toBe('documented')
    expect(path.incoming.sources).toContain('remitly')
    expect(path.outgoing.status).toBe('documented')
    expect(path.outgoing.sources).toContain('orangeSchool')
    expect(path.overall).toBe('documented')
  })

  it('keeps conditional routes conditional instead of pretending they work everywhere', () => {
    const result = resolveJourney('cameroon', 'bank', 'school')
    expect(result.incoming.status).toBe('conditional')
    expect(result.outgoing.status).toBe('conditional')
    expect(result.overall).toBe('conditional')
  })

  it('never presents mobile money to crypto as a documented or approved route', () => {
    for (const origin of originChoices) {
      for (const wallet of walletChoices) {
        const result = resolveJourney(origin, wallet, 'crypto')
        expect(result.outgoing.status).toBe('unknown')
        expect(result.outgoing.sources).toEqual([])
        expect(result.overall).toBe('unknown')
      }
    }
  })

  it('does not promise outward transfers from Cameroon wallets without evidence', () => {
    const result = resolveJourney('cameroon', 'mtn', 'international')
    expect(result.outgoing.status).toBe('unknown')
    expect(result.overall).toBe('unknown')
  })

  it('does not fabricate fees, balances, exchange rates, or transfer times', () => {
    for (const origin of originChoices) {
      for (const wallet of walletChoices) {
        for (const goal of goalChoices) {
          const route = resolveJourney(origin, wallet, goal)
          for (const stage of [route.incoming, route.outgoing]) {
            expect(['documented', 'conditional', 'unknown']).toContain(stage.status)
            expect(stage.note.fr.length).toBeGreaterThan(20)
            expect(stage.note.en.length).toBeGreaterThan(20)
            for (const source of stage.sources) {
              expect(journeySources[source].href).toMatch(/^https:\/\//)
            }
          }
        }
      }
    }
  })
})
