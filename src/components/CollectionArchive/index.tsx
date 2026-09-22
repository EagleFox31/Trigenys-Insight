import { cn } from '@/utilities/ui'
import React from 'react'

import { Card, CardPostData } from '@/components/Card'
import type { SiteLocale } from '@/i18n/config'
import type { ArticlePlacement } from '@/lib/analytics/events'

export type Props = {
  locale?: SiteLocale
  placement?: ArticlePlacement
  posts: CardPostData[]
}

export const CollectionArchive: React.FC<Props> = (props) => {
  const { locale = 'fr', placement = 'archive', posts } = props

  return (
    <div className={cn('container')}>
      <div>
        <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-12 gap-y-4 gap-x-4 lg:gap-y-8 lg:gap-x-8 xl:gap-x-8">
          {posts?.map((result, index) => {
            if (typeof result === 'object' && result !== null) {
              return (
                <div className="col-span-4" key={index}>
                  <Card
                    className="h-full"
                    doc={result}
                    locale={locale}
                    placement={placement}
                    relationTo="posts"
                    showCategories
                  />
                </div>
              )
            }

            return null
          })}
        </div>
      </div>
    </div>
  )
}
