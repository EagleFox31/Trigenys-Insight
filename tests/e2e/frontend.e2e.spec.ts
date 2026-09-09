import { expect, test } from '@playwright/test'

test.describe('Frontend', () => {
  test('can load homepage', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle(/Trigenys Insights/)
    const heading = page.locator('h1').first()
    await expect(heading).toContainText('Comprendre les systèmes.')
    await expect(page.getByRole('link', { name: /Explorer nos champs/i })).toBeVisible()
  })
})
