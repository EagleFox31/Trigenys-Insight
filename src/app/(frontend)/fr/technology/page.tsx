import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="fr" desk="technology" />
}

export const metadata = localizedDeskMetadata('fr', 'technology')
