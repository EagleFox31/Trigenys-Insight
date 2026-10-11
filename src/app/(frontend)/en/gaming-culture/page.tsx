import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="en" desk="gaming-culture" />
}

export const metadata = localizedDeskMetadata('en', 'gaming-culture')
