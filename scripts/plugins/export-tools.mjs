import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createInsightMCPServer } from '../../packages/insight-automation/dist/mcp.js'

const path = new URL('../../plugins/trigenys-insight/tools-contract.json', import.meta.url)
function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
  return value
}
const server = createInsightMCPServer({ request() { throw new Error('Metadata export cannot execute editorial operations') } })
const client = new Client({ name: 'insight-contract-check', version: '1.0.0' })
const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair()
try {
  await server.connect(serverTransport)
  await client.connect(clientTransport)
  const { tools } = await client.listTools()
  for (const tool of tools) {
    for (const flag of ['readOnlyHint', 'destructiveHint', 'openWorldHint']) if (typeof tool.annotations?.[flag] !== 'boolean') throw new Error(`${tool.name}: missing boolean ${flag}`)
    if (!tool._meta?.securitySchemes?.some(scheme => scheme.type === 'oauth2')) throw new Error(`${tool.name}: missing OAuth declaration`)
  }
  const output = JSON.stringify(stable({ tools: tools.sort((a, b) => a.name.localeCompare(b.name)) }), null, 2) + '\n'
  if (process.argv.includes('--write')) await writeFile(path, output)
  else {
    const reviewed = await readFile(path, 'utf8')
    if (reviewed !== output) {
      const lines = reviewed.split('\n')
      const actual = output.split('\n')
      const first = lines.findIndex((line, index) => line !== actual[index])
      const offset = first < 0 ? Math.min(lines.length, actual.length) : first
      throw new Error(`MCP contract changed at line ${offset + 1}. Reviewed: ${JSON.stringify(lines.slice(offset, offset + 4))}; generated: ${JSON.stringify(actual.slice(offset, offset + 4))}. Review the tool contract and run export-tools.mjs --write. This does not refresh a plugin or approve publication.`)
    }
  }
  console.log(`Verified ${tools.length} MCP tools; SHA-256 ${createHash('sha256').update(output).digest('hex')}`)
} finally {
  await client.close()
  await server.close()
}
