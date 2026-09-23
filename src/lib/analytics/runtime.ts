export function isEditorialAnalyticsEnabled(
  value = process.env.NEXT_PUBLIC_EDITORIAL_ANALYTICS_ENABLED,
) {
  if (!value) return true

  return !['0', 'false', 'off', 'disabled'].includes(value.trim().toLowerCase())
}
