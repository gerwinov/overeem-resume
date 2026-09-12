import { describe, expect, it, vi } from 'vitest'
import { buildMeetingEmail, createMeetingTool, meetingInputSchema } from '../server/utils/meeting'

const valid = { name: 'Sanne de Vries', email: 'sanne@voorbeeld.nl', message: 'We zoeken iemand voor ons AI-team.', organization: 'Voorbeeld BV' }

describe('meetingInputSchema', () => {
  it('accepts a normal request, with or without organization', () => {
    expect(meetingInputSchema.safeParse(valid).success).toBe(true)
    const { organization: _, ...withoutOrganization } = valid
    expect(meetingInputSchema.safeParse(withoutOrganization).success).toBe(true)
  })

  it.each([
    ['a line break in the name', { name: 'Sanne\nBcc: x@example.com' }],
    ['a U+2028 line separator in the name', { name: 'Sanne\u2028Bcc: x@example.com' }],
    ['a line break in the organization', { organization: 'Voorbeeld\r\nBcc: x@example.com' }],
    ['a blank name', { name: '   ' }],
    ['a line break in the email address', { email: 'sanne@voorbeeld.nl\nBcc: x@example.com' }],
    ['a comma in the email address', { email: 'sanne@voorbeeld.nl,x@example.com' }],
    ['quotes in the email address', { email: '"sanne"@voorbeeld.nl' }],
    ['angle brackets in the email address', { email: 'Sanne <sanne@voorbeeld.nl>' }],
    ['a space in the email address', { email: 'sanne @voorbeeld.nl' }],
    ['a U+2028 in the email address', { email: 'sanne@voorbeeld.nl\u2028' }],
    ['a non-ASCII email address', { email: 'sänne@voorbeeld.nl' }],
    ['an empty message', { message: '' }],
    ['a blank message', { message: '   ' }],
    ['a message over 1000 characters', { message: 'x'.repeat(1001) }],
    ['a name over 100 characters', { name: 'x'.repeat(101) }],
  ])('rejects %s', (_, change) => {
    expect(meetingInputSchema.safeParse({ ...valid, ...change }).success).toBe(false)
  })
})

describe('createMeetingTool', () => {
  it('names the invalid fields, not their values, and sends nothing', async () => {
    const send = vi.fn(async () => {})
    const meetingTool = createMeetingTool({ alreadySent: false, locale: 'nl', send, log: vi.fn() })
    const result = await meetingTool.execute!({ ...valid, email: 'not-an-address', message: '' }, { toolCallId: 't1', messages: [] })
    expect(result).toEqual({ ok: false, reason: 'invalid_input', fields: ['email', 'message'] })
    expect(JSON.stringify(result)).not.toContain('not-an-address')
    expect(send).not.toHaveBeenCalled()
  })
})

describe('buildMeetingEmail', () => {
  const email = buildMeetingEmail(valid, 'en', { from: 'cv-chat@overeem.io', to: 'gerwin@example.com' })

  it('uses fixed from, to and subject, and only the bare address as reply-to', () => {
    expect(email.from).toBe('cv-chat@overeem.io')
    expect(email.to).toBe('gerwin@example.com')
    expect(email.subject).toBe('Kennismakingsverzoek via overeem.io')
    expect(email.replyTo).toBe('sanne@voorbeeld.nl')
  })

  it('puts the visitor\'s details and the site language in the plain-text body', () => {
    expect(email.text).toContain('Naam: Sanne de Vries')
    expect(email.text).toContain('Organisatie: Voorbeeld BV')
    expect(email.text).toContain('Taal van de site: en')
    expect(email.text.endsWith('We zoeken iemand voor ons AI-team.')).toBe(true)
  })
})
