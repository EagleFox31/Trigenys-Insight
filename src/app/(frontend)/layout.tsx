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

  return (
    <html className={cn(inter.variable, fraunces.variable)} lang={locale} suppressHydrationWarning>
      <head>
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
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
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
  },
}
