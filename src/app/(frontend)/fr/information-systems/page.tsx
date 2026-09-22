import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="fr" desk="information-systems" />
}

export const metadata = localizedDeskMetadata('fr', 'information-systems')
