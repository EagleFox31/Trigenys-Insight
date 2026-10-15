import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const nodeNames = ['france', 'cameroon', 'orange', 'mtn', 'bank', 'cash', 'school', 'shopping', 'international', 'crypto'] as const

describe('money flow node visuals', () => {
  it('bundles a real local SVG image for every one of the ten network nodes', () => {
    for (const nodeName of nodeNames) {
      const asset = join(process.cwd(), 'public', 'money-flow', nodeName + '.svg')
      expect(existsSync(asset), nodeName).toBe(true)
      const svg = readFileSync(asset, 'utf8')
      expect(svg).toMatch(/^<svg /)
      expect(svg).toContain('viewBox="0 0 64 64"')
      expect(svg).toContain('</svg>')
      expect(svg).not.toMatch(/<script|onload=|<foreignObject/i)
    }
  })

  it('uses distinct source files and does not need third-party hotlinks', () => {
    const assets = nodeNames.map((name) => readFileSync(join(process.cwd(), 'public', 'money-flow', name + '.svg'), 'utf8'))
    expect(new Set(assets).size).toBe(nodeNames.length)
    expect(assets.join('')).not.toContain('http://')
  })
})
