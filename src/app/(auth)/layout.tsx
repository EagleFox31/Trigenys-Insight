import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import React from 'react'

import { cn } from '@/utilities/ui'

import '../(frontend)/globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' })

export const metadata: Metadata = {
  title: 'Administration | Trigenys Insights',
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={cn(inter.variable, fraunces.variable)} lang="fr">
      <body>{children}</body>
    </html>
  )
}
