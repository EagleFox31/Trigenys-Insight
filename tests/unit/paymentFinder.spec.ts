import {describe,expect,it} from 'vitest'
import {categoryLabels,collectionFeeEstimate,currentPaymentMethods,providers,rankProviders,simulateCollection,stackIntegration,togglePlannedMethod,type FinderProfile} from '@/components/payment-finder/catalog'

const base:FinderProfile={useCase:'saas',rail:'mobile',stack:'python',stage:'mvp',priority:'integration'}
const byName=(name:string)=>providers.find(p=>p.name===name)!

describe('Cameroon Payment Finder editorial catalog',()=>{
  it('preserves exactly 63 unique named entries in four explicit categories',()=>{
    expect(providers).toHaveLength(63)
    expect(new Set(providers.map(p=>p.id)).size).toBe(63)
    expect(new Set(providers.map(p=>p.name)).size).toBe(63)
    expect(providers.filter(p=>p.category==='gateway')).toHaveLength(48)
    expect(providers.filter(p=>p.category==='infrastructure')).toHaveLength(8)
    expect(providers.filter(p=>p.category==='orchestrator')).toHaveLength(4)
    expect(providers.filter(p=>p.category==='adjacent')).toHaveLength(3)
    expect(Object.keys(categoryLabels)).toHaveLength(4)
  })
  it('does not invent unknown fees or assume unreviewed providers are incompatible',()=>{
    expect(collectionFeeEstimate(byName('SupraPay'),100,10000)).toBeNull()
    const results=rankProviders(base)
    expect(results).toHaveLength(63)
    expect(results.find(r=>r.provider.name==='Kratos Pay')?.unknown.length).toBeGreaterThan(0)
    expect(results.every(r=>r.score>=0)).toBe(true)
  })
  it('computes only sourced public collection fees, not an invented all-in quote',()=>{
    expect(collectionFeeEstimate(byName('Fapshi'),100,10000)).toBe(30000)
    expect(collectionFeeEstimate(byName('ZITOPAY'),100,10000)).toBe(27000)
    expect(collectionFeeEstimate(byName('My-CoolPay'),100,10000)).toBe(18000)
    expect(byName('My-CoolPay').fee?.annualXaf).toBe(10000)
    expect(collectionFeeEstimate(byName('CamPay'),-1,10000)).toBeNull()
    expect(collectionFeeEstimate(byName('CamPay'),100,Number.NaN)).toBeNull()
  })
  it('uses only published characteristics in explanatory matching',()=>{
    const candidates=rankProviders(base)
    const fapshi=candidates.find(c=>c.provider.id==='fapshi')!
    expect(fapshi.known).toContain('Moyen de paiement annoncé dans la documentation')
    expect(fapshi.known).toContain('Sandbox annoncée')
    const unknown=candidates.find(c=>c.provider.id==='softeller')!
    expect(unknown.known).toHaveLength(0)
    expect(unknown.unknown).toContain('Moyen de paiement recherché non vérifié')
  })
  it('never gives an unsupported provider a claim of tested SAV',()=>{
    const c=rankProviders({...base,priority:'support'})
    expect(c.every(x=>x.unknown.includes('Qualité du SAV non mesurée'))).toBe(true)
  })
  it('reserves individual recommendations for documented individual KYC pathways',()=>{
    const solo=rankProviders({...base,stage:'individual',need:'collect',stack:'python'})
    const listed=solo.filter(c=>c.tier==='documented')
    expect(listed.length).toBeGreaterThan(0)
    expect(listed.every(c=>Boolean(c.provider.individualPathSource))).toBe(true)
    expect(listed.map(c=>c.provider.id)).toContain('fapshi')
    expect(listed.map(c=>c.provider.id)).toContain('payunit')
    expect(listed.map(c=>c.provider.id)).toContain('zitopay')
    expect(solo.find(c=>c.provider.id==='mesomb')?.tier).toBe('investigate')
  })
  it('matches a registered business bulk-payout scenario to documented mass payments rather than general gateways',()=>{
    const results=rankProviders({...base,stage:'company',useCase:'agency',need:'bulk',rail:'mobile',priority:'integration'})
    const documented=results.filter(c=>c.tier==='documented')
    expect(documented.map(c=>c.provider.id)).toEqual(['tranzak'])
    expect(documented[0].evidence.some(item=>item.label.includes('Verser'))).toBe(true)
    expect(results.find(c=>c.provider.id==='fapshi')?.tier).toBe('investigate')
  })
  it('recognizes multiple applications only when the provider documents separation of services',()=>{
    const results=rankProviders({...base,stage:'company',useCase:'agency',need:'multiService',rail:'mobile'})
    expect(results.filter(c=>c.tier==='documented').map(c=>c.provider.id)).toEqual(['mesomb'])
  })
  it('does not fabricate subscription renewals or marketplace split support',()=>{
    for (const need of ['subscription','split'] as const) {
      const matches=rankProviders({...base,stage:'company',need,useCase:need==='split'?'marketplace':'saas'})
      expect(matches.filter(c=>c.tier==='documented')).toHaveLength(0)
    }
  })
  it('a business payout shortlist differs from an individual collection shortlist for the same payment rail',()=>{
    const solo=rankProviders({...base,stage:'individual',need:'collect'})
      .filter(c=>c.tier==='documented').slice(0,3).map(c=>c.provider.id)
    const business=rankProviders({...base,stage:'company',need:'payout'})
      .filter(c=>c.tier==='documented').slice(0,3).map(c=>c.provider.id)
    expect(solo).not.toEqual(business)
    expect(business).toContain('tranzak')
    expect(business).toContain('bui')
  })

  it('requires every current method while keeping future methods out of eligibility',()=>{
    const profile:FinderProfile={...base,stage:'company',currentRails:['mobile','cards'],futureRails:['international']}
    const results=rankProviders(profile)
    expect(results.find(c=>c.provider.id==='zitopay')?.tier).toBe('documented')
    expect(results.find(c=>c.provider.id==='fapshi')?.tier).toBe('investigate')
    expect(rankProviders({...profile,currentRails:['mobile','cards','international']}).filter(c=>c.tier==='documented')).toHaveLength(0)
    expect(currentPaymentMethods({...base,rail:'mobileCards'})).toEqual(['mobile','cards'])
  })

  it('keeps a payment method in only one planning period',()=>{
    const plan=togglePlannedMethod({currentRails:['mobile','cards'],futureRails:['international']},'currentRails','international')
    expect(plan).toEqual({currentRails:['mobile','cards','international'],futureRails:[]})
    expect(togglePlannedMethod(plan,'futureRails','cards')).toEqual({currentRails:['mobile','international'],futureRails:['cards']})
  })

  it('distinguishes an official Kotlin SDK from a REST integration for Go and from unknown no-code support',()=>{
    expect(stackIntegration(byName('MeSomb'),'kotlin').kind).toBe('native')
    expect(stackIntegration(byName('MeSomb'),'go').kind).toBe('rest')
    expect(stackIntegration(byName('Fapshi'),'kotlin').kind).toBe('rest')
    expect(stackIntegration(byName('Fapshi'),'noCode').kind).toBe('unknown')
    expect(stackIntegration(byName('Kratos Pay'),'go').kind).toBe('unknown')
  })

  it('calculates each channel on its own volume and never substitutes a Mobile Money tariff for cards',()=>{
    const simulation={channels:[{rail:'mobile' as const,count:100,amountXaf:10000},{rail:'cards' as const,count:20,amountXaf:5000}]}
    const result=simulateCollection(byName('ZITOPAY'),simulation)
    expect(result.lines.map(line=>line.estimate)).toEqual([27000,4100])
    expect(result.total).toBe(31100)
    expect(collectionFeeEstimate(byName('My-CoolPay'),20,5000,'cards')).toBe(4000)
    const partial=simulateCollection(byName('Fapshi'),simulation)
    expect(partial.lines.map(line=>line.estimate)).toEqual([30000,null])
    expect(partial.total).toBeNull()
    expect(partial.complete).toBe(false)
    expect(collectionFeeEstimate(byName('ZITOPAY'),1000,1000)).toBe(36000)
    expect(collectionFeeEstimate(byName('SupraPay'),100,10000,'international')).toBeNull()
  })

  it('ranks known collection costs using the submitted volume, including fixed per-payment fees',()=>{
    const profile:FinderProfile={...base,stage:'individual',priority:'cost'}
    expect(rankProviders(profile,{channels:[{rail:'mobile',count:100,amountXaf:10000}]}).filter(c=>c.tier==='documented')[0].provider.id).toBe('zitopay')
    expect(rankProviders(profile,{channels:[{rail:'mobile',count:1000,amountXaf:1000}]}).filter(c=>c.tier==='documented')[0].provider.id).toBe('fapshi')
  })

})
