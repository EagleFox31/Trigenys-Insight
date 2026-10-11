import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="en" desk="tech-ai" />
}

export const metadata = localizedDeskMetadata('en', 'tech-ai')
