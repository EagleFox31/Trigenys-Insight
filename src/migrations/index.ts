import * as migration_20260909_073929 from './20260909_073929'
import * as migration_20260909_075327 from './20260909_075327'
import * as migration_20260909_075411 from './20260909_075411'
import * as migration_20260910_202858_add_media_prefix from './20260910_202858_add_media_prefix'

export const migrations = [
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
]
