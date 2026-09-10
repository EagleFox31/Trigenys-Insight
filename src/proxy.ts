import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasPayloadSession = request.cookies.has('payload-token')

  if (pathname === '/admin/login') {
    return NextResponse.redirect(new URL(hasPayloadSession ? '/admin' : '/login', request.url))
  }

  if (!hasPayloadSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/login'],
}
