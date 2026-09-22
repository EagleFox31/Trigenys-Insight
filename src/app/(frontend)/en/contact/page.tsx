import { PublisherInfoPage, publisherInfoMetadata } from '@/components/insights/PublisherInfoPage'

export default function Page() {
  return <PublisherInfoPage locale="en" kind="contact" />
}

export const metadata = publisherInfoMetadata('en', 'contact')
