import { logAiCrawlerHit } from '@/seo/aiCrawlers'
import { buildLlmsTxt } from '@/seo/llms'
import { getLlmsIndexPosts } from '@/seo/llmsData'

export async function GET(request: Request) {
  logAiCrawlerHit(request.headers.get('user-agent'), '/llms.txt')

  const body = buildLlmsTxt(await getLlmsIndexPosts())

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
