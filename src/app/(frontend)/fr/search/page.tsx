import { LocalizedSearchPage, localizedSearchMetadata } from '@/components/insights/LocalizedSearchPage'

type Args = { searchParams: Promise<{ q?: string }> }

export default async function Page({ searchParams }: Args) {
  const { q } = await searchParams
  return <LocalizedSearchPage locale="fr" query={q} />
}

export const metadata = localizedSearchMetadata('fr')
