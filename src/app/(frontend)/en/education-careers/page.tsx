import { LocalizedDeskPage, localizedDeskMetadata } from '@/components/insights/LocalizedDeskPage'

export default function Page() {
  return <LocalizedDeskPage locale="en" desk="education-careers" />
}

export const metadata = localizedDeskMetadata('en', 'education-careers')
