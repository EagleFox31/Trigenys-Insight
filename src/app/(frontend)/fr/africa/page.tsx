import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="fr" desk="africa" />
}

export const metadata = localizedDeskMetadata('fr', 'africa')
