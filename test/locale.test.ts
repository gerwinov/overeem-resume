import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('locales', () => {
  const keys = (code: string) => Object.keys(JSON.parse(readFileSync(new URL(`../i18n/locales/${code}.json`, import.meta.url), 'utf8'))).sort()

  it('nl.json and en.json have the same keys', () => {
    expect(keys('nl')).toEqual(keys('en'))
  })
})
