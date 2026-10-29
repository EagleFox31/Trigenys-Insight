import test from 'node:test'
import assert from 'node:assert/strict'
import { migrationPolicy } from '../vercel-build.mjs'

test('only production is allowed to migrate the database', () => {
  assert.deepEqual(migrationPolicy('production'), { migrate: true, environment: 'production' })
  assert.deepEqual(migrationPolicy('preview'), { migrate: false, environment: 'preview' })
  assert.deepEqual(migrationPolicy('development'), { migrate: false, environment: 'development' })
})

test('a missing or unknown deployment environment fails closed', () => {
  for (const value of [undefined, '', 'PRODUCTION', 'staging', 'test']) {
    assert.throws(() => migrationPolicy(value), /VERCEL_ENV must explicitly/)
  }
})
