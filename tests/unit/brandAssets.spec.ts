import { stat } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const assets = [
  'favicon.svg',
  'favicon.ico',
  'favicon-32x32.png',
  'favicon-48x48.png',
  'apple-touch-icon.png',
  'trigenys-insights-logo-512.png',
]

describe('brand assets', () => {
  it('keeps the public favicon and search-engine logo set available', async () => {
    for (const asset of assets) {
      const info = await stat(path.join(process.cwd(), 'public', asset))
      expect(info.isFile()).toBe(true)
      expect(info.size).toBeGreaterThan(0)
    }
  })
})
