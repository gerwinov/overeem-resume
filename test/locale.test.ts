import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

type Messages = Record<string, unknown>
const read = (code: string): Messages => JSON.parse(readFileSync(new URL(`../i18n/locales/${code}.json`, import.meta.url), 'utf8'))

/** Every key path in a locale file, array indices included, so a missing table row shows up too. */
function paths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix]
  return Object.entries(value).flatMap(([key, child]) => paths(child, prefix ? `${prefix}.${key}` : key))
}

const at = (messages: Messages, path: string) => path.split('.').reduce<any>((node, key) => node[key], messages)

describe('locales', () => {
  it('nl.json and en.json have the same keys', () => {
    expect(paths(read('nl')).sort()).toEqual(paths(read('en')).sort())
  })

  // vue-i18n reads some characters as syntax; rendered through it, every string must come out as written.
  it.each(['nl', 'en'])('%s renders every string exactly as written', (code) => {
    const messages = read(code)
    const options = { legacy: false, locale: code, messages: { [code]: messages }, strictMessage: true } as Parameters<typeof createI18n>[0]
    const { t } = createI18n(options).global
    for (const path of paths(messages)) {
      const source = at(messages, path) as string
      const params = Object.fromEntries([...source.matchAll(/\{(\w+)\}/g)].map(([, name]) => [name, `{${name}}`]))
      expect(t(path.replace(/\.(\d+)(?=\.|$)/g, '[$1]'), params), `${code}: ${path}`).toBe(source)
    }
  })
})
