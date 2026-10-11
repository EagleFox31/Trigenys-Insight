import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="fr" desk="tech-ai" />
}

export const metadata = localizedDeskMetadata('fr', 'tech-ai')
