import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TrackedOutboundLink } from '@/components/analytics/TrackedOutboundLink'
import { NewsletterForm } from '@/components/insights/NewsletterForm'
import { trackEditorialEvent } from '@/lib/analytics/client'

vi.mock('@/lib/analytics/client', () => ({
  trackEditorialEvent: vi.fn(),
}))

const track = vi.mocked(trackEditorialEvent)

function newsletterResponse(subscription: 'created' | 'reactivated' | 'existing', status = 200) {
  return new Response(JSON.stringify({ ok: true, subscription }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  cleanup()
  track.mockReset()
  vi.unstubAllGlobals()
})

describe('high-value editorial analytics actions', () => {
  it('tracks one privacy-safe source click and preserves normal navigation attributes', () => {
    render(
      <TrackedOutboundLink
        context="source-2"
        href="https://www.beac.int/report.pdf?token=do-not-track"
        locale="fr"
        slug="article-test"
        sourceId={42}
        sourcePosition={2}
        target="_blank"
      >
        Source BEAC
      </TrackedOutboundLink>,
    )

    const link = screen.getByRole('link', { name: 'Source BEAC' })
    expect(link.getAttribute('href')).toBe(
      'https://www.beac.int/report.pdf?token=do-not-track',
    )

    fireEvent.click(link)

    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('source_click', {
      slug: 'article-test',
      locale: 'fr',
      context: 'source-2',
      sourceId: '42',
      sourcePosition: 2,
      sourceDomain: 'beac.int',
    })
  })

  it('emits newsletter conversion only after a created subscription is confirmed', async () => {
    const fetchMock = vi.fn(async () => newsletterResponse('created', 201))
    vi.stubGlobal('fetch', fetchMock)

    render(<NewsletterForm locale="fr" />)

    fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
      target: { value: 'reader@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }))

    await waitFor(() => {
      expect(track).toHaveBeenCalledWith(
        'newsletter_subscribe_success',
        expect.objectContaining({ context: 'created' }),
      )
    })

    expect(track).toHaveBeenCalledWith(
      'newsletter_cta_click',
      expect.objectContaining({ context: 'submit' }),
    )
  })

  it('does not inflate conversions for an already-active subscriber', async () => {
    const fetchMock = vi.fn(async () => newsletterResponse('existing', 200))
    vi.stubGlobal('fetch', fetchMock)

    render(<NewsletterForm locale="fr" />)

    fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
      target: { value: 'reader@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    expect(track).toHaveBeenCalledWith(
      'newsletter_cta_click',
      expect.objectContaining({ context: 'submit' }),
    )
    expect(track).not.toHaveBeenCalledWith(
      'newsletter_subscribe_success',
      expect.anything(),
    )
  })

  it('does not emit newsletter success when the backend rejects the request', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<NewsletterForm locale="fr" />)

    fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
      target: { value: 'reader@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /s'inscrire/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    expect(track).not.toHaveBeenCalledWith(
      'newsletter_subscribe_success',
      expect.anything(),
    )
  })
})
