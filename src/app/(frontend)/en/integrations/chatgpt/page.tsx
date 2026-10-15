import type { Metadata } from 'next'
import { ChatGPTIntegrationPage } from '@/components/insights/ChatGPTIntegrationPage'
export const metadata: Metadata = {
  title: 'Trigenys Insight for ChatGPT',
  description:
    'Prepare, edit and schedule Trigenys Insight articles from ChatGPT with an authorized editorial account.',
  alternates: {
    canonical: '/en/integrations/chatgpt',
    languages: { fr: '/fr/integrations/chatgpt', en: '/en/integrations/chatgpt' },
  },
}
export default function Page() {
  return <ChatGPTIntegrationPage locale="en" />
}
