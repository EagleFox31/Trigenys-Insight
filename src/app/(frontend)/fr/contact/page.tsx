import { ContactPage } from '@/components/insights/ContactPage'
import { publisherInfoMetadata } from '@/components/insights/PublisherInfoPage'

export default function Page() {
  return <ContactPage locale="fr" />
}

export const metadata = publisherInfoMetadata('fr', 'contact')
