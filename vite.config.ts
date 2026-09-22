import { cloudflare } from '@cloudflare/vite-plugin'
import { imagesOptimizer } from '@vinext/cloudflare/images/images-optimizer'
import path from 'node:path'
import { defineConfig } from 'vite'
import vinext from 'vinext'

const configDir = path.dirname(new URL(import.meta.url).pathname)

export default defineConfig({
  plugins: [
    vinext({
      images: { optimizer: imagesOptimizer() },
    }),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
  ],
  resolve: {
    alias: {
      sharp: path.resolve(configDir, 'empty-stub.js'),
    },
  },
})
