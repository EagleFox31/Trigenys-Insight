import { PublisherInfoPage, publisherInfoMetadata } from '@/components/insights/PublisherInfoPage'

export default function Page() {
  return <PublisherInfoPage locale="fr" kind="methodology" />
}

export const metadata = publisherInfoMetadata('fr', 'methodology')
