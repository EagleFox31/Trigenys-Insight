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

  if (
    pathname === '/login' ||
    pathname.startsWith('/editorial/') ||
    pathname.startsWith('/next/')
  ) {
    return nextWithLocale(request, defaultLocale)
  }

  const firstSegment = pathname.split('/').filter(Boolean)[0]

  if (isSiteLocale(firstSegment)) {
    return nextWithLocale(request, firstSegment)
  }

  // Editorial public routes are canonicalized under /fr and /en.
  // Generic CMS pages remain on their legacy unprefixed URL until their
  // content model is localized too.
  const shouldLocalize =
    pathname === '/' ||
    pathname === '/posts' ||
    pathname.startsWith('/posts/') ||
    pathname === '/search'

  if (shouldLocalize) {
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/' ? `/${defaultLocale}` : `/${defaultLocale}${pathname}`
    return NextResponse.redirect(url, 308)
  }

  return nextWithLocale(request, defaultLocale)
}

export const config = {
  matcher: [
    '/admin',
    '/admin/login',
    '/((?!api|_next/static|_next/image|favicon.svg|robots.txt|.*\\..*).*)',
  ],
}
