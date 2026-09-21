import { LocalizedPostsArchivePage, localizedArchiveMetadata } from '@/components/insights/LocalizedPostsArchivePage'

export const dynamic = 'force-dynamic'

export default function Page() {
  return <LocalizedPostsArchivePage locale="en" />
}

export const metadata = localizedArchiveMetadata('en')
