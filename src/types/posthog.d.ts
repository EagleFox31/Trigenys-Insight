export {}

declare global {
  interface Window {
    posthog?: {
      capture?: (event: string, properties?: Record<string, unknown>) => void
    }
    __TRIGENYS_ANALYTICS_TEST_EVENTS__?: Array<{
      event: string
      properties: Record<string, unknown>
    }>
  }
}
