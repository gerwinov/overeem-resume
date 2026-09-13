import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = new URL('../', import.meta.url).pathname

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|vue)$/.test(entry.name) ? [path] : []
  })
}

// Nuxt's server build treats shared/ as external. An import of it by a relative path can come out
// of that build as a path that no longer resolves, so code outside shared/ uses the #shared alias.
describe('imports of shared/', () => {
  it('go through #shared or auto-imports, never by a relative path', () => {
    const files = ['app', 'server', 'test'].flatMap(dir => sourceFiles(join(ROOT, dir)))
    const offenders = files.filter(file => /from\s+['"](\.\.?\/)+[^'"]*shared\//.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})
