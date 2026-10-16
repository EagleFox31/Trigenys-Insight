'use client'

import Image from 'next/image'
import { useState } from 'react'
import assets from './brand-assets.json'
import type { Provider } from './catalog'

const brands: Record<string, {path:string; source:string}> = assets

export function ProviderLogo({provider, compact=false}: {provider:Provider; compact?:boolean}) {
  const [failed,setFailed] = useState(false)
  const brand = brands[provider.id]
  const size = compact ? 32 : 48
  return <span aria-hidden="true" className={'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1.5 '+(compact?'size-9':'size-12')}>
    {brand && !failed ? <Image src={brand.path} alt="" width={size} height={size} quality={100} unoptimized={/\.(svg|ico)$/.test(brand.path)} onError={()=>setFailed(true)} className="max-h-full w-full object-contain"/> :
      <span className="text-xs font-bold text-[#102e48]">{provider.name.replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase()}</span>}
  </span>
}
