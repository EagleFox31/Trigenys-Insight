import { LocalizedHomePage, localizedHomeMetadata } from '@/components/insights/LocalizedHomePage'

export const dynamic = 'force-dynamic'

export default function Page() {
  return <LocalizedHomePage locale="fr" />
}

export const metadata = localizedHomeMetadata('fr')
