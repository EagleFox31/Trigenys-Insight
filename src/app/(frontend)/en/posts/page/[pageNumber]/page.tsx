import { LocalizedPostsArchivePage, localizedArchiveMetadata } from '@/components/insights/LocalizedPostsArchivePage'

export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ pageNumber: string }> }

export default async function Page({ params }: Args) {
  const { pageNumber } = await params
  return <LocalizedPostsArchivePage locale="en" pageNumber={Number(pageNumber)} />
}

export async function generateMetadata({ params }: Args) {
  const { pageNumber } = await params
  return localizedArchiveMetadata('en', Number(pageNumber))
}
