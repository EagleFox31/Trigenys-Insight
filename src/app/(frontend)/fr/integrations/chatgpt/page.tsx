import type { Metadata } from 'next'
import { ChatGPTIntegrationPage } from '@/components/insights/ChatGPTIntegrationPage'
export const metadata: Metadata = {
  title: 'Trigenys Insight pour ChatGPT',
  description:
    'Préparez, révisez et programmez vos articles Trigenys Insight depuis ChatGPT avec un compte éditorial autorisé.',
  alternates: {
    canonical: '/fr/integrations/chatgpt',
    languages: { fr: '/fr/integrations/chatgpt', en: '/en/integrations/chatgpt' },
  },
}
export default function Page() {
  return <ChatGPTIntegrationPage locale="fr" />
}
