import { defaultLocale, isSiteLocale } from '@/i18n/config'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

function nextWithLocale(request: NextRequest, locale: 'fr' | 'en') {
  const headers = new Headers(request.headers)
  headers.set('x-trigenys-locale', locale)
  return NextResponse.next({ request: { headers } })
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasPayloadSession = request.cookies.has('payload-token')

  if (pathname === '/admin/login') {
    return NextResponse.redirect(new URL(hasPayloadSession ? '/admin' : '/login', request.url))
  }

  if (pathname === '/admin') {
    if (!hasPayloadSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
  }

  // Keep internal editorial tools and the custom login outside public locale routing.
  if (
    pathname === '/login' ||
    pathname.startsWith('/editorial/') ||
    pathname.startsWith('/next/')
  ) {
    return nextWithLocale(request, defaultLocale)
  }

  const firstSegment = pathname.split('/').filter(Boolean)[0]

  if (!isSiteLocale(firstSegment)) {
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/' ? `/${defaultLocale}` : `/${defaultLocale}${pathname}`
    return NextResponse.redirect(url, 308)
  }

  return nextWithLocale(request, firstSegment)
}

export const config = {
  matcher: [
    '/admin',
    '/admin/login',
    '/((?!api|_next/static|_next/image|favicon.svg|robots.txt|.*\\..*).*)',
  ],
}
