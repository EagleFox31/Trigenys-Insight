import { describe, expect, it } from 'vitest'
import { assessProviders, selectDiverseShortlist, weightsByPriority } from '@/components/payment-finder/decisionEngine'
import type { FinderProfile, PaymentSimulation } from '@/components/payment-finder/catalog'

const profile:FinderProfile={useCase:'saas',rail:'mobile',stack:'python',stage:'individual',need:'collect',priority:'cost'}
const sample=(count:number,amountXaf:number):PaymentSimulation=>({channels:[{rail:'mobile',count,amountXaf}]})
const find=(results:ReturnType<typeof assessProviders>,id:string)=>results.find(c=>c.provider.id===id)!

describe('Payment Finder V2: transparent MCDA',()=>{
  it('evaluates the same 63 entries with normalized scores and distinct evidence coverage',()=>{
    const results=assessProviders(profile,sample(100,10000))
    expect(results).toHaveLength(63)
    expect(new Set(results.map(r=>r.provider.id)).size).toBe(63)
    expect(results.every(r=>r.evidenceCoverage>=0&&r.evidenceCoverage<=100)).toBe(true)
    expect(results.every(r=>r.suitability===null||(r.suitability>=0&&r.suitability<=100))).toBe(true)
    expect(find(results,'softeller').suitability).toBeNull()
    expect(find(results,'softeller').evidenceCoverage).toBe(0)
    expect(find(results,'zitopay').evidenceCoverage).toBeGreaterThan(find(results,'softeller').evidenceCoverage)
  })
  it('never invents a zero-cost fee when a provider has no public price',()=>{
    const results=assessProviders(profile,sample(100,10000))
    expect(find(results,'payunit').criteria.find(c=>c.key==='cost')?.rating).toBeNull()
    expect(find(results,'zitopay').criteria.find(c=>c.key==='cost')?.rating).not.toBeNull()
    expect(find(results,'payunit').criteria.find(c=>c.key==='cost')?.explanation).toContain('Aucun coût comparable')
  })
  it('makes cost scores respond to the number and size of transactions',()=>{
    const higherAmounts=assessProviders(profile,sample(100,10000))
    const manySmall=assessProviders(profile,sample(1000,1000))
    const largeZito=find(higherAmounts,'zitopay').criteria.find(c=>c.key==='cost')!.rating!
    const largeFapshi=find(higherAmounts,'fapshi').criteria.find(c=>c.key==='cost')!.rating!
    const smallZito=find(manySmall,'zitopay').criteria.find(c=>c.key==='cost')!.rating!
    const smallFapshi=find(manySmall,'fapshi').criteria.find(c=>c.key==='cost')!.rating!
    expect(largeZito).toBeGreaterThan(largeFapshi)
    expect(smallZito).toBeLessThan(smallFapshi)
  })
  it('does not compare collection commissions for corporate payouts',()=>{
    const payout=assessProviders({...profile,stage:'company',need:'payout'},sample(100,10000))
    expect(payout.every(p=>!p.criteria.some(c=>c.key==='cost'))).toBe(true)
    expect(find(payout,'tranzak').tier).toBe('documented')
    expect(find(payout,'fapshi').tier).toBe('investigate')
  })
  it('uses future coverage as a documented optional criterion, not a mandatory current rail',()=>{
    const base=assessProviders({...profile,priority:'coverage'},sample(100,10000))
    const future=assessProviders({...profile,priority:'coverage',futureRails:['cards']},sample(100,10000))
    expect(find(base,'zitopay').criteria.some(c=>c.key==='future')).toBe(false)
    expect(find(future,'zitopay').criteria.find(c=>c.key==='future')?.rating).toBe(100)
    expect(find(future,'fapshi').criteria.find(c=>c.key==='future')?.rating).toBeNull()
    expect(find(future,'fapshi').tier).toBe('documented')
  })
  it('never assigns fake SAV performance even when support is the user priority',()=>{
    const results=assessProviders({...profile,priority:'support'})
    expect(results.every(r=>r.unknown.includes('Qualité du SAV non mesurée'))).toBe(true)
    expect(results.every(r=>!r.criteria.some(c=>/SAV|support/i.test(c.label)))).toBe(true)
  })
  it('weights every priority on five explicit dimensions totalling 100',()=>{
    Object.values(weightsByPriority).forEach(weights=>
      expect(Object.values(weights).reduce((a,b)=>a+b,0)).toBe(100))
  })
  it('diversifies only sufficiently close and documented candidates without ever including unqualified leads',()=>{
    const results=assessProviders({...profile,stage:'company',priority:'integration'})
    const a={...find(results,'fapshi'),suitability:90}
    const b={...find(results,'mesomb'),suitability:88}
    const c={...find(results,'campay'),suitability:89}
    const distant={...find(results,'notch-pay'),suitability:72}
    const unverified={...find(results,'softeller'),suitability:99}
    const selected=selectDiverseShortlist([unverified,a,c,b,distant],2)
    expect(selected.map(c=>c.provider.id)).toEqual(['fapshi','mesomb'])
    expect(selected.every(c=>c.tier==='documented')).toBe(true)
    expect(selected.map(c=>c.provider.id)).not.toContain('softeller')
  })
  it('does not overclaim any documented solution for an undocumented split payment',()=>{
    const results=assessProviders({...profile,stage:'company',useCase:'marketplace',need:'split'})
    expect(selectDiverseShortlist(results)).toHaveLength(0)
  })
})
