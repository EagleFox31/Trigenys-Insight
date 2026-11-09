import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { SiteLocale } from '@/i18n/config'
import type { PublicAuthorProfile } from '@/seo/structuredData'
import { authorSlug } from '@/utilities/authorSlug'

export type PublicAuthorFields = Omit<PublicAuthorProfile, 'name'>

/**
 * Public author fields keyed by author slug. Users are private: only the
 * explicit public profile fields are read, server side, and nothing else
 * leaves this function. Shared by author pages and article JSON-LD so both
 * describe the same Person.
 */
export const getPublicAuthorProfiles = cache(
  async (locale: SiteLocale): Promise<Record<string, PublicAuthorFields>> => {
    try {
      const payload = await getPayload({ config: configPromise })
      const result = await payload.find({
        collection: 'users',
        depth: 0,
        fallbackLocale: false,
        locale,
        limit: 200,
        pagination: false,
        overrideAccess: true,
        select: {
          name: true,
          jobTitle: true,
          bio: true,
          expertise: true,
          profileLinks: true,
        },
      })

      const profiles: Record<string, PublicAuthorFields> = {}
      for (const user of result.docs) {
        if (!user.name) continue
        profiles[authorSlug(user.name)] = {
          jobTitle: user.jobTitle,
          bio: user.bio,
          expertise: user.expertise,
          profileLinks: user.profileLinks?.map((link) => ({ url: link.url })),
        }
      }
      return profiles
    } catch (error) {
      console.warn(`Trigenys Insights: author profiles unavailable for locale ${locale}.`, error)
      return {}
    }
  },
)
