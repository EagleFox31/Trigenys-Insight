import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="fr" desk="business" />
}

export const metadata = localizedDeskMetadata('fr', 'business')
