import type { NextConfig } from 'next'

export const redirects: NextConfig['redirects'] = async () => {
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

  return [homepageRedirect, internetExplorerRedirect]
}
