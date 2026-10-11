import { headers } from 'next/headers'

import { SiteSkeleton } from '@/components/insights/SiteSkeleton'
import { isKnownEditorialCrawler } from '@/components/insights/loadingPolicy'

/**
 * The loading UI is purely presentational: every request eventually receives
 * the same published article and metadata. Suppressing the placeholder for
 * known HTML-reading crawlers avoids placing a fake "loading" page ahead of
 * the editorial HTML. Human readers retain the original skeleton on both
 * initial page load and client-side transitions.
 */
export default async function Loading() {
  const userAgent = (await headers()).get('user-agent') || ''

  if (isKnownEditorialCrawler(userAgent)) return null

  return <SiteSkeleton />
}
