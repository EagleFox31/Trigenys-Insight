import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { permanentRedirect } from 'next/navigation'
import { getCachedRedirects } from '@/utilities/getRedirects'
import type { SiteLocale } from '@/i18n/config'

// Resolve only local reference redirects created in Payload Redirects. Never
// trust an arbitrary external URL as the target of an article slug rename.
export async function redirectOldPostSlug(slug: string, locale: SiteLocale | null): Promise<void> {
  const oldPath = locale ? `/${locale}/posts/${slug}` : `/posts/${slug}`
  const aliases = await getCachedRedirects()()
  const match = aliases.find((entry) => entry.from === oldPath)
  const ref = match?.to?.reference
  if (ref?.relationTo !== 'posts') return
  const id = typeof ref.value === 'number' ? ref.value : ref.value?.id
  if (typeof id !== 'number') return

  const chosenLocale = locale ?? 'fr'
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'posts',
    where: { id: { equals: id } },
    locale: chosenLocale,
    fallbackLocale: false,
    draft: false,
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const published = result.docs[0]
  if (!published || published._status !== 'published' || !published.title || !published.content) return
  if (published.slug === slug && locale) return
  permanentRedirect(`/${chosenLocale}/posts/${encodeURIComponent(published.slug)}`)
}
