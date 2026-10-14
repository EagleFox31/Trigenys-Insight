import * as migration_20260909_073929 from './20260909_073929'
import * as migration_20260909_075327 from './20260909_075327'
import * as migration_20260909_075411 from './20260909_075411'
import * as migration_20260910_202858_add_media_prefix from './20260910_202858_add_media_prefix'
import * as migration_20261011_232139_add_post_answer_fields from './20261011_232139_add_post_answer_fields'
import * as migration_20261011_232733_add_author_public_profile from './20261011_232733_add_author_public_profile'
import * as migration_20261014_121500_add_mcp_oauth from './20261014_121500_add_mcp_oauth'

export const migrations = [
  // Keep migrations in chronological order.
  {
    up: migration_20260909_073929.up,
    down: migration_20260909_073929.down,
    name: '20260909_073929',
  },
  {
    up: migration_20260909_075327.up,
    down: migration_20260909_075327.down,
    name: '20260909_075327',
  },
  {
    up: migration_20260909_075411.up,
    down: migration_20260909_075411.down,
    name: '20260909_075411',
  },
  {
    up: migration_20260910_202858_add_media_prefix.up,
    down: migration_20260910_202858_add_media_prefix.down,
    name: '20260910_202858_add_media_prefix',
  },
  {
    up: migration_20261011_232139_add_post_answer_fields.up,
    down: migration_20261011_232139_add_post_answer_fields.down,
    name: '20261011_232139_add_post_answer_fields',
  },
  {
    up: migration_20261011_232733_add_author_public_profile.up,
    down: migration_20261011_232733_add_author_public_profile.down,
    name: '20261011_232733_add_author_public_profile',
  },
  { up: migration_20261014_121500_add_mcp_oauth.up, down: migration_20261014_121500_add_mcp_oauth.down, name: '20261014_121500_add_mcp_oauth' },
]
