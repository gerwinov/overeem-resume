import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// The tests run without Nuxt, so Nuxt's #shared alias is defined here as well. Page code imports shared/
// through it: a relative import there can make the server build emit an unresolvable path.
export default defineConfig({
  resolve: {
    alias: { '#shared': fileURLToPath(new URL('./shared', import.meta.url)) },
  },
})
