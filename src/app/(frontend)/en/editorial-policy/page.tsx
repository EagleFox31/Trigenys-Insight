import { PublisherInfoPage, publisherInfoMetadata } from '@/components/insights/PublisherInfoPage'

export default function Page() {
  return <PublisherInfoPage locale="en" kind="editorial-policy" />
}

export const metadata = publisherInfoMetadata('en', 'editorial-policy')
