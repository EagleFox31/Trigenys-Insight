import {describe,expect,it} from 'vitest'
import {categoryLabels,collectionFeeEstimate,providers,rankProviders,type FinderProfile} from '@/components/payment-finder/catalog'

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
    expect(fapshi.known).toContain('Moyen de paiement documenté')
    expect(fapshi.known).toContain('Sandbox documentée')
    const unknown=candidates.find(c=>c.provider.id==='softeller')!
    expect(unknown.known).toHaveLength(0)
    expect(unknown.unknown).toContain('Couverture du moyen de paiement')
  })
  it('never gives an unsupported provider a claim of tested SAV',()=>{
    const c=rankProviders({...base,priority:'support'})
    expect(c.every(x=>x.unknown.includes('Performance SAV non mesurée'))).toBe(true)
  })
})
