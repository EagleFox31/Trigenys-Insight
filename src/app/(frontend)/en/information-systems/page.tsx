import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="en" desk="information-systems" />
}

export const metadata = localizedDeskMetadata('en', 'information-systems')
