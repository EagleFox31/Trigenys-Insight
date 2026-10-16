import {describe,expect,it} from 'vitest'
import {deferInternational,previewCoverage} from '@/components/payment-finder/coverage'

describe('Payment Finder coverage before results',()=>{
  it('does not imply that every inventory entry is qualified when no method is selected',()=>{
    expect(previewCoverage({})).toBeNull()
    expect(previewCoverage({rail:'mobile',currentRails:[]})).toBeNull()
  })
  it('detects the unsupported combination in our dataset before asking for stack or status',()=>{
    const coverage=previewCoverage({useCase:'saas',currentRails:['mobile','cards','international']})!
    expect(coverage.count).toBe(0)
    expect(coverage.reason).toBe('methods')
    expect(coverage.complete).toBe(false)
    expect(previewCoverage({currentRails:['international']})!.count).toBeGreaterThan(0)
  })
  it('keeps future requirements separate and reports pricing gaps for the selected methods',()=>{
    const now=previewCoverage({currentRails:['mobile','cards']})!
    const future=previewCoverage({currentRails:['mobile','cards'],futureRails:['international']})!
    expect(future.count).toBe(now.count)
    expect(future.priced).toBeGreaterThan(0)
    expect(future.priced!).toBeLessThan(future.count)
  })
  it('identifies a new KYC or operation constraint as soon as that answer is selected',()=>{
    expect(previewCoverage({currentRails:['international'],stage:'mvp'})!.reason).toBe('stage')
    expect(previewCoverage({currentRails:['international'],stage:'mvp'})!.count).toBe(0)
    expect(previewCoverage({currentRails:['mobile'],stage:'company',need:'subscription'})!.reason).toBe('operation')
    expect(previewCoverage({currentRails:['mobile'],stage:'company',need:'subscription'})!.count).toBe(0)
    expect(previewCoverage({currentRails:['mobile'],stage:'company',need:'bulk'})!.count).toBeGreaterThan(0)
    expect(previewCoverage({currentRails:['mobile'],stage:'company',need:'bulk'})!.priced).toBeNull()
  })
  it('moves the international goal without discarding current methods or other answers',()=>{
    const plan=deferInternational({useCase:'agency',stack:'go',stage:'company',currentRails:['mobile','cards','international'],futureRails:[]})
    expect(plan.currentRails).toEqual(['mobile','cards'])
    expect(plan.futureRails).toEqual(['international'])
    expect(plan.stack).toBe('go')
    expect(previewCoverage(plan)!.count).toBeGreaterThan(0)
  })
})
