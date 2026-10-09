import Link from 'next/link'
import React from 'react'

export const NewsRadarNavLink: React.FC = () => {
  return (
    <Link
      href="/editorial/news-radar"
      style={{
        display: 'block',
        padding: '10px 12px',
        margin: '4px 0',
        borderRadius: 6,
        fontWeight: 600,
        textDecoration: 'none',
      }}
    >
      ✦ News Radar
    </Link>
  )
}
