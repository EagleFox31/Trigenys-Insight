import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { PostHogScript } from '@/components/analytics/PostHogScript'

import { cn } from '@/utilities/ui'
import { Fraunces, Inter } from 'next/font/google'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { buildSiteIdentityJsonLd, serializeJsonLd } from '@/seo/structuredData'
import { draftMode, headers } from 'next/headers'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'
import { defaultLocale, isSiteLocale } from '@/i18n/config'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' })

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const requestHeaders = await headers()
  const requestedLocale = requestHeaders.get('x-trigenys-locale')
  const locale = isSiteLocale(requestedLocale) ? requestedLocale : defaultLocale
  const siteIdentityJsonLd = buildSiteIdentityJsonLd()

  return (
    <html className={cn(inter.variable, fraunces.variable)} lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteIdentityJsonLd) }}
          type="application/ld+json"
        />
      </head>
      <body>
        <Providers>
          <AdminBar adminBarProps={{ preview: isEnabled }} />
          <Header />
          {children}
          <Footer />
          <PostHogScript />
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  description:
    'Recherche et analyses indépendantes sur la technologie, la cybersécurité, le business et les systèmes numériques.',
  metadataBase: new URL(getServerSideURL()),
  title: {
    default: 'Trigenys Insights',
    template: '%s | Trigenys Insights',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
  },
}
