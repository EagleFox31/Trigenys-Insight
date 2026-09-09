import { BrandMark } from '@/components/insights/BrandMark'
import Link from 'next/link'
import React from 'react'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="insights-shell site-footer__grid">
        <div>
          <BrandMark inverse />
          <p>Research for better decisions.</p>
        </div>
        <div>
          <p className="site-footer__label">Explorer</p>
          <Link href="/posts">Analyses</Link>
          <Link href="/#methodologie">Méthodologie</Link>
          <Link href="/#newsletter">Newsletter</Link>
        </div>
        <div>
          <p className="site-footer__label">Trigenys</p>
          <a href="https://github.com/EagleFox31/Trigenys-Insight" rel="noreferrer" target="_blank">
            GitHub
          </a>
          <Link href="/admin">Rédaction</Link>
        </div>
      </div>
      <div className="insights-shell site-footer__bottom">
        <span>© {new Date().getFullYear()} Trigenys Insights</span>
        <span>Conçu à Douala. Pensé pour aller loin.</span>
      </div>
    </footer>
  )
}
