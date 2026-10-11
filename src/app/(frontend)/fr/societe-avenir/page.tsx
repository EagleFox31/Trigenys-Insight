import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="fr" desk="society-future" />
}

export const metadata = localizedDeskMetadata('fr', 'society-future')
