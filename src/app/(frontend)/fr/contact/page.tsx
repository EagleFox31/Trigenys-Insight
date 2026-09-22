import { PublisherInfoPage, publisherInfoMetadata } from '@/components/insights/PublisherInfoPage'

export default function Page() {
  return <PublisherInfoPage locale="fr" kind="contact" />
}

export const metadata = publisherInfoMetadata('fr', 'contact')
