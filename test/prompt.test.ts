import { describe, expect, it } from 'vitest'
import { renderSystemPrompt } from '../server/utils/prompt'

const base = { cv: '# Profiel\nCV text', about: 'About text', locale: 'nl' as const, meetingSent: false, now: new Date('2026-09-12T10:00:00Z') }

describe('renderSystemPrompt', () => {
  it('puts the content first, in tags', () => {
    const prompt = renderSystemPrompt(base)
    expect(prompt.startsWith('<cv>\n# Profiel\nCV text\n</cv>\n\n<about>\nAbout text\n</about>')).toBe(true)
  })

  it('leaves the authors\' HTML comments out of the content', () => {
    const about = 'Intro\n\n<!-- TODO Gerwin: rewrite this\n  paragraph -->\nParagraph'
    const prompt = renderSystemPrompt({ ...base, cv: '<!-- DUMMY CONTENT -->\n# Profiel', about })
    expect(prompt).not.toMatch(/TODO|DUMMY|<!--/)
    expect(prompt).toContain('<cv>\n# Profiel\n</cv>')
    expect(prompt).toContain('<about>\nIntro\n\nParagraph\n</about>')
  })

  it('ends with the date and the website language', () => {
    const prompt = renderSystemPrompt(base)
    expect(prompt).toContain("Today's date: 12 September 2026.")
    expect(prompt).toContain('Website language (use only as the last resort in rule 6): Dutch.')
  })

  it('mentions an earlier send only when there was one', () => {
    expect(renderSystemPrompt(base)).not.toContain('already been sent')
    expect(renderSystemPrompt({ ...base, meetingSent: true })).toContain('A meeting request has already been sent in this conversation.')
  })
})
