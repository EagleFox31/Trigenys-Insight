import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="fr" desk="made-in-africa" />
}

export const metadata = localizedDeskMetadata('fr', 'made-in-africa')
