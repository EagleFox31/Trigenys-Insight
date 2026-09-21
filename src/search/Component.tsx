'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SiteLocale } from '@/i18n/config'
import { withLocale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import React, { useEffect, useState } from 'react'
import { useDebounce } from '@/utilities/useDebounce'
import { useRouter } from 'next/navigation'

export const Search: React.FC<{ locale?: SiteLocale }> = ({ locale = 'fr' }) => {
  const [value, setValue] = useState('')
  const router = useRouter()
  const t = getMessages(locale).search

  const debouncedValue = useDebounce(value)

  useEffect(() => {
    router.push(withLocale(locale, `/search${debouncedValue ? `?q=${encodeURIComponent(debouncedValue)}` : ''}`))
  }, [debouncedValue, locale, router])

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <Label htmlFor="search" className="sr-only">
          {t.title}
        </Label>
        <Input
          id="search"
          onChange={(event) => {
            setValue(event.target.value)
          }}
          placeholder={t.placeholder}
        />
        <button type="submit" className="sr-only">
          {t.title}
        </button>
      </form>
    </div>
  )
}
