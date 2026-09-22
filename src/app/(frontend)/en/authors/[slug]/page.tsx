import { LocalizedAuthorPage, localizedAuthorMetadata } from '@/components/insights/LocalizedAuthorPage'

type Args = { params: Promise<{ slug?: string }> }

export default async function Page({ params }: Args) {
  const { slug = '' } = await params
  return <LocalizedAuthorPage locale="en" slug={decodeURIComponent(slug)} />
}

export async function generateMetadata({ params }: Args) {
  const { slug = '' } = await params
  return localizedAuthorMetadata({ locale: 'en', slug: decodeURIComponent(slug) })
}
