import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="en" desk="made-in-africa" />
}

export const metadata = localizedDeskMetadata('en', 'made-in-africa')
