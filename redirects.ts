import { editorialRubrics, localizedRubricPath } from './src/editorial/rubrics'
import type { NextConfig } from 'next'

export const redirects: NextConfig['redirects'] = async () => {
  const legacyVercelHostRedirect = {
    source: '/:path*',
    has: [
      {
        type: 'host' as const,
        value: 'trigenys-insight.vercel.app',
      },
    ],
    destination: 'https://insight.trigenys.com/:path*',
    permanent: true,
  }

  const homepageRedirect = {
    source: '/',
    destination: '/fr',
    permanent: true,
  }

  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header' as const,
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  const legacyEditorialPaths = [
    { old: 'technology', rubric: 'tech-ai' },
    { old: 'business', rubric: 'business-finance' },
    { old: 'information-systems', rubric: 'tech-ai' },
    { old: 'africa', rubric: 'society-future' },
    { old: 'consommer-local', rubric: 'made-in-africa' },
  ] as const

  const editorialRedirects = (['fr', 'en'] as const).flatMap((locale) =>
    legacyEditorialPaths.map(({ old, rubric }) => {
      const target = editorialRubrics.find((section) => section.id === rubric)
      if (!target) throw new Error(`Unknown canonical rubric: ${rubric}`)
      return {
        source: `/${locale}/${old}`,
        destination: localizedRubricPath(target, locale),
        permanent: true,
      }
    }),
  )

  return [legacyVercelHostRedirect, homepageRedirect, ...editorialRedirects, internetExplorerRedirect]
}
