import { expect, test } from '@playwright/test'

test.describe('Editorial analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__TRIGENYS_ANALYTICS_TEST_EVENTS__ = []
    })
  })

  test('uses the in-memory adapter and never sends analytics from localhost', async ({ page }) => {
    const externalAnalyticsRequests: string[] = []

    page.on('request', (request) => {
      const url = request.url()
      if (/posthog|vercel-insights|\/e\/?$|\/i\/v0\/e\//i.test(url)) {
        externalAnalyticsRequests.push(url)
      }
    })

    await page.goto('http://localhost:3000/fr')

    const articleLinks = page.locator('a[href*="/fr/posts/"]:visible')
    if ((await articleLinks.count()) === 0) {
      test.skip(true, 'No published article card exists in the local test database.')
    }

    const link = articleLinks.first()
    await link.scrollIntoViewIfNeeded()
    await page.waitForTimeout(550)

    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.__TRIGENYS_ANALYTICS_TEST_EVENTS__?.some(
            (entry) => entry.event === 'article_card_impression',
          ),
        ),
      )
      .toBe(true)

    await Promise.all([
      page.waitForURL(/\/fr\/posts\//),
      link.click(),
    ])

    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.__TRIGENYS_ANALYTICS_TEST_EVENTS__?.some(
            (entry) => entry.event === 'article_card_click',
          ),
        ),
      )
      .toBe(true)

    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.__TRIGENYS_ANALYTICS_TEST_EVENTS__?.some(
            (entry) => entry.event === 'article_view',
          ),
        ),
      )
      .toBe(true)

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(350)

    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.__TRIGENYS_ANALYTICS_TEST_EVENTS__?.some(
            (entry) => entry.event === 'article_read_50',
          ),
        ),
      )
      .toBe(true)

    expect(externalAnalyticsRequests).toEqual([])
  })
})
