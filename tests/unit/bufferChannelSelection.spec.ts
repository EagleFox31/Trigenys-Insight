// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  selectNamedSocialChannel,
  adaptTrackedSource,
} from '@/integrations/buffer/channelSelection'
const c = (name: string, service = 'linkedin') => ({ name, service })
describe('named Buffer destination', () => {
  it('never falls back to the previous brand', () => {
    expect(selectNamedSocialChannel([c('Trigenys Group')], 'AgenStudio')).toBeNull()
  })
  it('matches brand spacing and case and prefers LinkedIn', () => {
    const linked = c('AGEN STUDIO')
    expect(selectNamedSocialChannel([c('AgenStudio', 'facebook'), linked], 'AgenStudio')).toBe(
      linked,
    )
  })
  it('uses the actual Facebook channel when that is the brand connected', () => {
    const facebook = c('AgenStudio', 'facebook')
    expect(selectNamedSocialChannel([c('Trigenys Group'), facebook], 'AgenStudio')).toBe(facebook)
  })
  it('prefers an exact brand over a different longer name', () => {
    const exact = c('AgenStudio', 'facebook')
    expect(selectNamedSocialChannel([c('AgenStudio Old'), exact], 'AgenStudio')).toBe(exact)
  })
  it('rejects ambiguity and unsupported channels', () => {
    expect(selectNamedSocialChannel([c('AgenStudio'), c('AGENSTUDIO')], 'AgenStudio')).toBeNull()
    expect(selectNamedSocialChannel([c('AgenStudio', 'threads')], 'AgenStudio')).toBeNull()
  })
  it('adapts only the tracked Insight link to the actual network', () => {
    const text =
      'Body https://insight.trigenys.com/fr/posts/test?utm_source=linkedin&utm_medium=social&utm_campaign=insight-post-21\n#Cameroun'
    expect(adaptTrackedSource(text, 'facebook')).toBe(
      text.replace('utm_source=linkedin', 'utm_source=facebook'),
    )
    expect(adaptTrackedSource('https://example.com/?utm_source=linkedin', 'facebook')).toBe(
      'https://example.com/?utm_source=linkedin',
    )
  })
})
