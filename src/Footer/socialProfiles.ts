const configuredProfiles = [
  { name: 'LinkedIn', url: process.env.NEXT_PUBLIC_INSIGHT_LINKEDIN_URL, host: 'linkedin.com' },
  { name: 'Facebook', url: process.env.NEXT_PUBLIC_INSIGHT_FACEBOOK_URL, host: 'facebook.com' },
  { name: 'Instagram', url: process.env.NEXT_PUBLIC_INSIGHT_INSTAGRAM_URL, host: 'instagram.com' },
  { name: 'Threads', url: process.env.NEXT_PUBLIC_INSIGHT_THREADS_URL, host: 'threads.net' },
]

export const socialProfiles = configuredProfiles.flatMap(({ name, url, host }) => {
  if (!url) return []
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || (parsed.hostname !== host && parsed.hostname !== `www.${host}`)) return []
    return [{ name, url: parsed.toString() }]
  } catch {
    return []
  }
})
