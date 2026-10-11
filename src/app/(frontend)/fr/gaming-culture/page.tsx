import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="fr" desk="gaming-culture" />
}

export const metadata = localizedDeskMetadata('fr', 'gaming-culture')
