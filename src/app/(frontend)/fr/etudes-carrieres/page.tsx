import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="fr" desk="education-careers" />
}

export const metadata = localizedDeskMetadata('fr', 'education-careers')
