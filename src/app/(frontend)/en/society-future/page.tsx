import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="en" desk="society-future" />
}

export const metadata = localizedDeskMetadata('en', 'society-future')
