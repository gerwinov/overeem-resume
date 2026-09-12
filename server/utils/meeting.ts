import { tool } from 'ai'
import { Resend } from 'resend'
import { z } from 'zod'
import type { Locale } from '../../shared/utils/chat'

// Header-injection rules from docs/spec.md, "Tool: request_meeting".
const SINGLE_LINE = /^[^\p{Cc}\p{Zl}\p{Zp}]*$/u
const NOT_BLANK = /\S/
const PRINTABLE_ASCII = /^[\x21-\x7E]+$/
const NO_ADDRESS_LIST_CHARS = /^[^"',;<>]+$/
const ONE_AT = /^[^@]+@[^@]+$/

export const meetingInputSchema = z.object({
  name: z.string().min(1).max(100).regex(NOT_BLANK).regex(SINGLE_LINE)
    .describe('The visitor\'s name'),
  email: z.email().max(254).regex(PRINTABLE_ASCII).regex(NO_ADDRESS_LIST_CHARS).regex(ONE_AT)
    .describe('The visitor\'s email address, which Gerwin replies to'),
  message: z.string().min(1).max(1000).regex(NOT_BLANK)
    .describe('What the visitor would like to discuss, in their own words'),
  organization: z.string().max(100).regex(SINGLE_LINE).optional()
    .describe('The visitor\'s organization, if they gave one'),
})

export type MeetingRequest = z.infer<typeof meetingInputSchema>

export type MeetingResult =
  | { ok: true }
  | { ok: false, reason: 'already_sent' | 'send_in_progress' | 'send_failed' }
  // Field names only, never their values, so the model knows what to ask the visitor again.
  | { ok: false, reason: 'invalid_input', fields: string[] }

export type SendMeetingEmail = (request: MeetingRequest, locale: Locale) => Promise<void>

/**
 * One tool instance per request. Its state makes sure a request sends at most one email, also when the
 * model calls the tool in parallel: everything up to setting 'sending' runs before the first await.
 */
export function createMeetingTool(options: {
  alreadySent: boolean
  locale: Locale
  send: SendMeetingEmail
  log: (line: string) => void
}) {
  let state: 'idle' | 'sending' | 'sent' = options.alreadySent ? 'sent' : 'idle'

  return tool({
    description: 'Sends Gerwin an intro-meeting request by email. Call it only when the visitor\'s latest message explicitly confirms the summary you showed them.',
    inputSchema: meetingInputSchema,
    execute: async (input): Promise<MeetingResult> => {
      if (state === 'sent') return { ok: false, reason: 'already_sent' }
      if (state === 'sending') return { ok: false, reason: 'send_in_progress' }

      const parsed = meetingInputSchema.safeParse(input)
      if (!parsed.success) {
        const fields = [...new Set(parsed.error.issues.map(issue => String(issue.path[0] ?? 'input')))]
        return { ok: false, reason: 'invalid_input', fields }
      }

      state = 'sending'
      try {
        await options.send(parsed.data, options.locale)
        state = 'sent'
        return { ok: true }
      }
      catch (error) {
        state = 'idle'
        options.log(`[meeting] send failed${error instanceof MeetingSendError ? ` (${error.code})` : ''}`)
        return { ok: false, reason: 'send_failed' }
      }
    },
  })
}

const SUBJECT = 'Kennismakingsverzoek via overeem.io'

/** The email to Gerwin. Visitor input only ever goes into the plain-text body and the bare reply-to address. */
export function buildMeetingEmail(request: MeetingRequest, locale: Locale, env: { from: string, to: string }) {
  const text = [
    'Nieuw kennismakingsverzoek via de chat op overeem.io.',
    '',
    `Naam: ${request.name}`,
    `E-mail: ${request.email}`,
    `Organisatie: ${request.organization?.trim() || '–'}`,
    `Taal van de site: ${locale}`,
    '',
    'Bericht:',
    request.message,
  ].join('\n')

  return { from: env.from, to: env.to, subject: SUBJECT, replyTo: request.email, text }
}

export class MeetingSendError extends Error {
  constructor(readonly code: string) {
    super(`Meeting email not sent: ${code}`)
    this.name = 'MeetingSendError'
  }
}

/** Sends through Resend, with the settings read from the environment at send time. */
export const sendWithResend: SendMeetingEmail = async (request, locale) => {
  const { RESEND_API_KEY: apiKey, MEETING_RECIPIENT: to, MEETING_FROM: from } = process.env
  if (!apiKey || !to || !from) throw new MeetingSendError('not_configured')

  const { error } = await new Resend(apiKey).emails.send(buildMeetingEmail(request, locale, { from, to }))
  if (error) throw new MeetingSendError(error.name)
}
