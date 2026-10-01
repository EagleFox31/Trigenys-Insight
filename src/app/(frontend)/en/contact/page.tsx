import { ContactPage } from '@/components/insights/ContactPage'
import { publisherInfoMetadata } from '@/components/insights/PublisherInfoPage'

export default function Page() {
  return <ContactPage locale="en" />
}

export const metadata = publisherInfoMetadata('en', 'contact')
