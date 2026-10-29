#!/usr/bin/env node
// Do not let Vercel preview deployments migrate a shared production database.
// The deployment environment is authoritative, not the branch name or URL.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export function migrationPolicy(environment) {
  if (environment === 'production') return { migrate: true, environment }
  if (environment === 'preview' || environment === 'development')
    return { migrate: false, environment }
  throw new Error('VERCEL_ENV must explicitly be production, preview, or development; refusing DB migration')
}

export function main() {
  const policy = migrationPolicy(process.env.VERCEL_ENV)
  const cli = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const run = (args) => {
    const result = spawnSync(cli, args, { stdio: 'inherit', env: process.env })
    if (result.error) throw result.error
    if (result.status !== 0) process.exit(result.status || 1)
  }
  if (policy.migrate) {
    console.log('[vercel-build] PRODUCTION: running tracked schema migrations before build')
    run(['run', 'db:migrate'])
  } else {
    console.log(`[vercel-build] ${policy.environment.toUpperCase()}: skipping DB migrations (database is not mutated)`)
  }
  run(['run', 'build'])
}

// Do not invoke the build when this module is imported by its regression tests.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
