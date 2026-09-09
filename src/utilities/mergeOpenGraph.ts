import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description:
    'Recherche et analyses indépendantes sur la technologie, la cybersécurité, le business et les systèmes numériques.',
  images: [
    {
      url: `${getServerSideURL()}/api/og`,
    },
  ],
  siteName: 'Trigenys Insights',
  title: 'Trigenys Insights — Research for better decisions',
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
