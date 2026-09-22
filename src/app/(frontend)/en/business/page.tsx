import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="en" desk="business" />
}

export const metadata = localizedDeskMetadata('en', 'business')
