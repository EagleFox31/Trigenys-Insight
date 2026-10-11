import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="en" desk="business-finance" />
}

export const metadata = localizedDeskMetadata('en', 'business-finance')
