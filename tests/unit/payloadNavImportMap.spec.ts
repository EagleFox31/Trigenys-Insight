import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Payload admin registration', () => {
  it('contains an import-map entry for each registered admin navigation control', async () => {
    const root = process.cwd()
    const [config, map] = await Promise.all([
      readFile(path.join(root, 'src/payload.config.ts'), 'utf8'),
      readFile(path.join(root, 'src/app/(payload)/admin/importMap.js'), 'utf8'),
    ])
    const match = config.match(/afterNavLinks:\s*\[([^\]]+)\]/)
    expect(match, 'Payload admin afterNavLinks should be configured').not.toBeNull()
    const components = [...(match?.[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(components).toContain('@/components/SetupRubricsNavControl#SetupRubricsNavControl')
    for (const component of components) {
      expect(map, `Missing generated import-map entry for ${component}`).toContain(
        `"${component}":`,
      )
    }
  })
})
