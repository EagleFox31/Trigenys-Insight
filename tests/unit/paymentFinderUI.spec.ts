import { createElement as h, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { CalculatorInputs } from '@/components/payment-finder/CalculatorInputs'
import { PaymentFinder } from '@/components/payment-finder/PaymentFinder'
import type { PaymentSimulation } from '@/components/payment-finder/catalog'

afterEach(cleanup)

describe('Payment Finder interactions',()=>{
  it('submits validated values explicitly, allows clearing inputs, and preserves the last submitted simulation',()=>{
    const onSimulate=vi.fn()
    render(h(CalculatorInputs,{rails:['mobile'],simulation:null,onSimulate}))
    const count=screen.getByLabelText('Nombre de paiements')
    fireEvent.change(count,{target:{value:''}})
    expect((count as HTMLInputElement).value).toBe('')
    expect(onSimulate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'Lancer la simulation'}))
    expect(screen.getByRole('alert').textContent).toContain('Saisis')
    expect(onSimulate).not.toHaveBeenCalled()
    fireEvent.change(count,{target:{value:'1000'}})
    fireEvent.change(screen.getByLabelText('Montant moyen par paiement (FCFA)'),{target:{value:'1000'}})
    fireEvent.click(screen.getByRole('button',{name:'Lancer la simulation'}))
    expect(onSimulate).toHaveBeenCalledWith({channels:[{rail:'mobile',count:1000,amountXaf:1000}]})
  })

  it('announces pending changes until the recalculation button is pressed',()=>{
    function Harness(){
      const [simulation,setSimulation]=useState<PaymentSimulation|null>(null)
      return h(CalculatorInputs,{rails:['mobile'],simulation,onSimulate:setSimulation})
    }
    render(h(Harness))
    fireEvent.click(screen.getByRole('button',{name:'Lancer la simulation'}))
    fireEvent.change(screen.getByLabelText('Nombre de paiements'),{target:{value:'1000'}})
    expect(screen.getByText(/Valeurs modifiées/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button',{name:'Recalculer les commissions'}))
    expect(screen.queryByText(/Valeurs modifiées/)).toBeNull()
  })

  it('supports Mobile Money and cards now, international later, Go, and editing without losing the plan',()=>{
    render(h(PaymentFinder))
    fireEvent.click(screen.getByRole('button',{name:'Un SaaS'}))
    const now=screen.getByRole('group',{name:'À gérer maintenant'})
    const later=screen.getByRole('group',{name:'Prévu plus tard (facultatif)'})
    expect((screen.getByRole('button',{name:'Continuer'}) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(within(now).getByLabelText('Mobile Money'))
    fireEvent.click(within(now).getByLabelText('Cartes bancaires'))
    fireEvent.click(within(later).getByLabelText('Paiements internationaux'))
    fireEvent.click(screen.getByRole('button',{name:'Continuer'}))
    expect(screen.getByRole('button',{name:'Kotlin / Android'})).toBeTruthy()
    fireEvent.click(screen.getByRole('button',{name:'Go'}))
    fireEvent.click(screen.getByRole('button',{name:'Une entreprise enregistrée'}))
    fireEvent.click(screen.getByRole('button',{name:'Encaisser des clients'}))
    fireEvent.click(screen.getByRole('button',{name:'Les frais'}))
    expect(screen.getByText(/Plus tard : Paiements internationaux/)).toBeTruthy()
    expect(screen.getAllByLabelText('Nombre de paiements')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button',{name:'Lancer la simulation'}))
    expect(screen.getAllByText('Total collecte').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button',{name:'Modifier mes réponses'}))
    fireEvent.click(screen.getByRole('button',{name:'Un SaaS'}))
    expect((within(screen.getByRole('group',{name:'À gérer maintenant'})).getByLabelText('Cartes bancaires') as HTMLInputElement).checked).toBe(true)
    expect((within(screen.getByRole('group',{name:'Prévu plus tard (facultatif)'})).getByLabelText('Paiements internationaux') as HTMLInputElement).checked).toBe(true)
  })
})
