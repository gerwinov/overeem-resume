import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (name: string) => readFileSync(new URL(`../server/assets/content/${name}`, import.meta.url), 'utf8')

// The CV structure from docs/cv-conversion-spec.md; the prompt and the PII guard rely on it.
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

describe('llms.txt', () => {
  const text = readFileSync(new URL('../public/llms.txt', import.meta.url), 'utf8')
  const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]!)

  it('has the llmstxt.org structure: title, summary and a contact section', () => {
    const lines = text.split('\n')
    expect(lines[0]).toBe('# Gerwin Overeem')
    expect(lines.some(line => line.startsWith('> '))).toBe(true)
    expect(lines).toContain('## Contact')
  })

  // The spec keeps the CV server-side, so the file may point to LinkedIn and email only.
  it('links only LinkedIn and email', () => {
    expect(links).toHaveLength(2)
    for (const url of links) expect(url).toMatch(/^(mailto:|https:\/\/www\.linkedin\.com\/in\/)/)
  })

  it('uses the email address from the CV', () => {
    const email = links.find(url => url.startsWith('mailto:'))!.slice('mailto:'.length)
    expect(read('cv.md')).toContain(email)
  })
})
