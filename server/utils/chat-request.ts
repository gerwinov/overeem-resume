import { z } from 'zod'
import type { UIMessage } from 'ai'

// Limits from docs/spec.md, "Safety & cost".
export const MAX_MESSAGES = 30
export const MAX_VISITOR_MESSAGE_CHARS = 1000
export const MAX_HISTORY_CHARS = 30_000

export const LOCALES = ['nl', 'en'] as const
export type Locale = (typeof LOCALES)[number]

const textPart = z.object({
  type: z.literal('text'),
  text: z.string(),
})

const stepStartPart = z.object({
  type: z.literal('step-start'),
})

// The only tool. States that belong to tool approval are not used, so they are rejected.
const meetingToolPart = z.object({
  type: z.literal('tool-request_meeting'),
  toolCallId: z.string().min(1).max(200),
  state: z.enum(['input-streaming', 'input-available', 'output-available', 'output-error']),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  errorText: z.string().optional(),
})

const userMessage = z.object({
  id: z.string().min(1).max(200),
  role: z.literal('user'),
  parts: z.array(textPart).min(1),
  metadata: z.unknown().optional(),
})

const assistantMessage = z.object({
  id: z.string().min(1).max(200),
  role: z.literal('assistant'),
  parts: z.array(z.discriminatedUnion('type', [textPart, stepStartPart, meetingToolPart])),
  metadata: z.unknown().optional(),
})

const chatRequestSchema = z.object({
  messages: z.array(z.discriminatedUnion('role', [userMessage, assistantMessage])).min(1).max(MAX_MESSAGES),
  locale: z.enum(LOCALES),
})

export type ChatRequest = { messages: UIMessage[], locale: Locale }

type Parsed = z.infer<typeof chatRequestSchema>
type ParsedMessage = Parsed['messages'][number]

const visitorText = (message: ParsedMessage) =>
  message.role === 'user' ? message.parts.map(part => part.text).join('') : ''

function historyChars(messages: ParsedMessage[]) {
  let total = 0
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'text') total += part.text.length
      else if (part.type === 'tool-request_meeting') {
        total += JSON.stringify(part.input ?? null).length + JSON.stringify(part.output ?? null).length
        total += part.errorText?.length ?? 0
      }
    }
  }
  return total
}

/** Checks a /api/chat body against the spec's limits. `null` means: reject with HTTP 400. */
export function parseChatRequest(body: unknown): ChatRequest | null {
  const result = chatRequestSchema.safeParse(body)
  if (!result.success) return null
  const { messages, locale } = result.data

  if (messages[0]?.role !== 'user' || messages.at(-1)?.role !== 'user') return null
  for (const message of messages) {
    if (message.role !== 'user') continue
    const text = visitorText(message)
    if (text.trim().length === 0 || text.length > MAX_VISITOR_MESSAGE_CHARS) return null
  }
  if (historyChars(messages) > MAX_HISTORY_CHARS) return null

  return { messages: messages as UIMessage[], locale }
}
