import { getIndexNowKey } from '@/seo/indexNow'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = getIndexNowKey()

  if (!key) {
    return new Response('IndexNow verification is not configured.', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }

  return new Response(key, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
