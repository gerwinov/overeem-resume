import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (name: string) => readFileSync(new URL(`../server/assets/content/${name}`, import.meta.url), 'utf8')

// The CV structure from docs/cv-conversion.md; the prompt and the PII guard rely on it.
const CV_HEADINGS = ['# Profiel', '# Expertise', '# Techniek', '# Werkervaring', '# Opleidingen', '# Talen', "# Hobby's"]

describe('content files', () => {
  it('cv.md has every required heading, in order', () => {
    const lines = read('cv.md').split('\n')
    const positions = CV_HEADINGS.map(heading => lines.indexOf(heading))
    expect(positions).not.toContain(-1)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('about.md is not empty', () => {
    expect(read('about.md').trim().length).toBeGreaterThan(0)
  })
})
