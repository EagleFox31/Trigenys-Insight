import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
// Rasterize the existing vector brand asset without redesigning the logo.
const svg = await readFile(new URL('../../public/favicon.svg', import.meta.url))
await sharp(svg, { density: 576 }).resize(512, 512).png().toFile(new URL('../../plugins/trigenys-insight/submission/assets/logo.png', import.meta.url).pathname)
