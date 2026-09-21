import type { SiteLocale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import React from 'react'

export const PageRange: React.FC<{
  className?: string
  collection?: string
  currentPage?: number
  limit?: number
  locale?: SiteLocale
  totalDocs?: number
}> = (props) => {
  const { className, currentPage, limit, locale = 'fr', totalDocs } = props
  const t = getMessages(locale).archive

  let indexStart = (currentPage ? currentPage - 1 : 1) * (limit || 1) + 1
  if (totalDocs && indexStart > totalDocs) indexStart = 0

  let indexEnd = (currentPage || 1) * (limit || 1)
  if (totalDocs && indexEnd > totalDocs) indexEnd = totalDocs

  return (
    <div className={[className, 'font-semibold'].filter(Boolean).join(' ')}>
      {(typeof totalDocs === 'undefined' || totalDocs === 0) && t.none}
      {typeof totalDocs !== 'undefined' &&
        totalDocs > 0 &&
        `${t.showing} ${indexStart}${indexStart > 0 ? ` - ${indexEnd}` : ''} ${t.of} ${totalDocs} ${t.posts}`}
    </div>
  )
}
