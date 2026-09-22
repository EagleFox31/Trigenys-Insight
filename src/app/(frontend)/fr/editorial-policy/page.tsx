import { PublisherInfoPage, publisherInfoMetadata } from '@/components/insights/PublisherInfoPage'

export default function Page() {
  return <PublisherInfoPage locale="fr" kind="editorial-policy" />
}

export const metadata = publisherInfoMetadata('fr', 'editorial-policy')
