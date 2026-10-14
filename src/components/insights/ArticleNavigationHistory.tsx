'use client'

import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

const ArticleNavigationContext = createContext<string | null>(null)

/**
 * Record only actual in-app client navigations.
 * A directly opened article gets no internal history (even if the browser
 * contains history entries from search engines or unrelated sites).
 * No cross-request cookies, storage, tracking or query-string redirects.
 */
export function ArticleNavigationHistory({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const currentPathRef = useRef<string | null>(null)
  const [previousPath, setPreviousPath] = useState<string | null>(null)

  useEffect(() => {
    if (!pathname) return

    const current = window.location.pathname + window.location.search + window.location.hash
    const previous = currentPathRef.current
    if (previous !== null && previous !== current) {
      setPreviousPath(previous)
    }
    currentPathRef.current = current
  }, [pathname])

  return (
    <ArticleNavigationContext.Provider value={previousPath}>
      {children}
    </ArticleNavigationContext.Provider>
  )
}

export function usePreviousArticlePage() {
  return useContext(ArticleNavigationContext)
}
