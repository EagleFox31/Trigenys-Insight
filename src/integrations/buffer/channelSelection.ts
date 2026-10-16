type NamedChannel = { name: string; service: string }
const normalized = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()

// Resolve the owner's named destination only from the live Buffer account.
// Prefer LinkedIn when both supported networks have that exact brand name.
export function selectNamedSocialChannel<T extends NamedChannel>(
  channels: T[],
  name: string,
): T | null {
  const target = normalized(name)
  if (!target) return null
  const supported = channels.filter((c) =>
    ['linkedin', 'facebook'].includes(c.service.toLowerCase()),
  )
  const exact = supported.filter((c) => normalized(c.name) === target)
  const candidates = exact.length
    ? exact
    : supported.filter((c) => normalized(c.name).startsWith(target))
  for (const service of ['linkedin', 'facebook']) {
    const matches = candidates.filter((c) => c.service.toLowerCase() === service)
    if (matches.length > 1) return null
    if (matches.length === 1) return matches[0]
  }
  return null
}

export function adaptTrackedSource(text: string, service: string): string {
  return text.replace(/https:\/\/insight\.trigenys\.com\/[^\s]+/g, (value) => {
    const url = new URL(value)
    if (url.searchParams.has('utm_source'))
      url.searchParams.set('utm_source', service.toLowerCase())
    return url.toString()
  })
}
