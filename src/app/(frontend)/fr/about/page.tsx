import { PublisherInfoPage, publisherInfoMetadata } from '@/components/insights/PublisherInfoPage'

export default function Page() {
  return <PublisherInfoPage locale="fr" kind="about" />
}

export const metadata = publisherInfoMetadata('fr', 'about')
