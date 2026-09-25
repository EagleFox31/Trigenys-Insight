const configuredProfiles = [
  { name: 'LinkedIn', url: process.env.NEXT_PUBLIC_TRIGENYS_LINKEDIN_URL || 'https://www.linkedin.com/company/145209329/', host: 'linkedin.com' },
  { name: 'Facebook', url: process.env.NEXT_PUBLIC_TRIGENYS_FACEBOOK_URL || 'https://www.facebook.com/share/1FMm14cri9/', host: 'facebook.com' },
  { name: 'Instagram', url: process.env.NEXT_PUBLIC_TRIGENYS_INSTAGRAM_URL || 'https://www.instagram.com/trigenysgroup/', host: 'instagram.com' },
  { name: 'Threads', url: process.env.NEXT_PUBLIC_TRIGENYS_THREADS_URL, host: 'threads.net' },
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
