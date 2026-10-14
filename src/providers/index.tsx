import React from 'react'

import { HeaderThemeProvider } from './HeaderTheme'
import { ArticleNavigationHistory } from '@/components/insights/ArticleNavigationHistory'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <HeaderThemeProvider>
      <ArticleNavigationHistory>{children}</ArticleNavigationHistory>
    </HeaderThemeProvider>
  )
}
