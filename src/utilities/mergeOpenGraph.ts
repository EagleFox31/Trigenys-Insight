import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'
import { SITE_POSITIONING } from '@/seo/positioning'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: SITE_POSITIONING.fr.description,
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
