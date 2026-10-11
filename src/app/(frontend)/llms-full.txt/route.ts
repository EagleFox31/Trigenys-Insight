import { logAiCrawlerHit } from '@/seo/aiCrawlers'
import { buildLlmsFullTxt } from '@/seo/llms'
import { getLlmsFullPosts } from '@/seo/llmsData'

export async function GET(request: Request) {
  logAiCrawlerHit(request.headers.get('user-agent'), '/llms-full.txt')

  const body = buildLlmsFullTxt(await getLlmsFullPosts())

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
