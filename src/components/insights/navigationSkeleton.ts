/**
 * This checks browser navigations, not crawler user agents. Editorial HTML is
 * served identically on direct requests to real visitors and search engines.
 */
export function shouldShowNavigationSkeleton(current: URL, target: URL) {
  return (
    target.origin === current.origin &&
    target.pathname !== current.pathname &&
    /^\/(fr|en)(\/|$)/.test(target.pathname)
  )
}
