'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { SiteSkeleton } from '@/components/insights/SiteSkeleton'
import { shouldShowNavigationSkeleton } from '@/components/insights/navigationSkeleton'

type PendingNavigation = { from: string; to: string }

/**
 * Show the existing editorial skeleton only during browser-side navigation.
 *
 * Keeping the root loading.tsx absent means direct requests render the same
 * server-side article HTML for users and crawlers, without UA-based cloaking.
 */
export function NavigationSkeleton() {
  const pathname = usePathname()
  const [pending, setPending] = useState<PendingNavigation | null>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (showTimer.current !== null) clearTimeout(showTimer.current)
    if (stopTimer.current !== null) clearTimeout(stopTimer.current)

    function resetTimers() {
      if (showTimer.current !== null) clearTimeout(showTimer.current)
      if (stopTimer.current !== null) clearTimeout(stopTimer.current)
      showTimer.current = null
      stopTimer.current = null
    }

    function onLinkClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const element = event.target
      if (!(element instanceof Element)) return
      const anchor = element.closest('a[href]')
      if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) {
        return
      }

      const current = new URL(window.location.href)
      let destination: URL
      try {
        destination = new URL(anchor.href, current)
      } catch {
        return
      }

      if (!shouldShowNavigationSkeleton(current, destination)) return

      resetTimers()
      // Avoid a distracting flash when Next.js has already prefetched a route.
      showTimer.current = setTimeout(() => {
        if (window.location.pathname === current.pathname) {
          setPending({ from: current.pathname, to: destination.pathname })
        }
      }, 150)
      // Never trap the reader behind a skeleton after a rejected navigation.
      stopTimer.current = setTimeout(() => {
        setPending(null)
        resetTimers()
      }, 10000)
    }

    document.addEventListener('click', onLinkClick)
    window.addEventListener('popstate', resetTimers)
    return () => {
      document.removeEventListener('click', onLinkClick)
      window.removeEventListener('popstate', resetTimers)
      resetTimers()
    }
  }, [])

  // Once the route changes the existing skeleton is hidden synchronously.
  // The pending state is cleared on the next click or timeout, never in an effect.
  if (!pending || pending.from !== pathname) return null

  return (
    <div
      aria-label={pending.to.startsWith('/en') ? 'Loading page' : 'Chargement de la page'}
      className="fixed inset-0 z-[70] overflow-y-auto bg-background"
      data-client-navigation-skeleton
    >
      <SiteSkeleton pathnameOverride={pending.to} />
    </div>
  )
}
