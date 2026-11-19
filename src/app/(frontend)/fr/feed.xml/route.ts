import { rssResponse } from '@/seo/rssRoute'

export const dynamic = 'force-dynamic'

export function GET() {
  return rssResponse('fr')
}
