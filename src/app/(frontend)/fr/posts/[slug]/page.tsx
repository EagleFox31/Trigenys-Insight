import { LocalizedPostPage, localizedPostMetadata } from '@/components/insights/LocalizedPostPage'

export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ slug?: string }> }

export default async function Page({ params }: Args) {
  const { slug = '' } = await params
  return <LocalizedPostPage locale="fr" slug={slug} />
}

export async function generateMetadata({ params }: Args) {
  const { slug = '' } = await params
  return localizedPostMetadata({ locale: 'fr', slug })
}
