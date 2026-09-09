import Link from 'next/link'
import React from 'react'

type BrandMarkProps = {
  compact?: boolean
  inverse?: boolean
}

export function BrandMark({ compact = false, inverse = false }: BrandMarkProps) {
  return (
    <Link className="brand-mark" href="/" aria-label="Trigenys Insights — accueil">
      <svg aria-hidden="true" className="brand-mark__symbol" viewBox="0 0 54 54">
        <path d="M5 8h34v9H27v29h-9V17H5z" fill="currentColor" />
        <path
          d="M22 43c6-15 15-24 28-28-11 7-18 16-22 29z"
          fill={inverse ? '#f29a38' : '#e07520'}
        />
        <rect fill={inverse ? '#f29a38' : '#e07520'} height="9" rx="1" width="9" x="40" y="8" />
      </svg>
      {!compact && (
        <span className="brand-mark__wordmark">
          <strong>TRIGENYS</strong>
          <span>INSIGHTS</span>
        </span>
      )}
    </Link>
  )
}
