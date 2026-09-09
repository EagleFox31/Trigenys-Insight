import { BrandMark } from '@/components/insights/BrandMark'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const navItems = [
  { href: '/#technology', label: 'Tech' },
  { href: '/#business', label: 'Business' },
  { href: '/#systems', label: "Systèmes d'information" },
  { href: '/#africa', label: 'Afrique' },
  { href: '/#methodologie', label: 'Méthodologie' },
]

export function Header() {
  return (
    <header className="site-header">
      <div className="insights-shell site-header__inner">
        <BrandMark />
        <nav aria-label="Navigation principale" className="site-header__nav">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          <span className="locale-pill">FR</span>
          <Link className="header-cta" href="/#newsletter">
            Le Brief <ArrowUpRight aria-hidden="true" size={14} />
          </Link>
        </div>
      </div>
    </header>
  )
}
