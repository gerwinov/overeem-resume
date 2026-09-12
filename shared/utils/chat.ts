import type { FinishReason, UIMessage } from 'ai'

// The /api/chat contract, shared by the page and the server. Limits from docs/spec.md, "Safety & cost";
// the server enforces them, the page only avoids hitting them.
export const MAX_MESSAGES = 30
export const MAX_VISITOR_MESSAGE_CHARS = 1000

export const LOCALES = ['nl', 'en'] as const
export type Locale = (typeof LOCALES)[number]

/** A message as /api/chat streams it: the final finish reason arrives as metadata. */
export type CvChatMessage = UIMessage<{ finishReason?: FinishReason }>

type Part = UIMessage['parts'][number]

export const isMeetingPart = (part: Part) => part.type === 'tool-request_meeting'

export function isSuccessfulSend(part: Part) {
  if (!isMeetingPart(part) || !('state' in part) || part.state !== 'output-available') return false
  const output = (part as { output?: unknown }).output
  return typeof output === 'object' && output !== null && (output as { ok?: unknown }).ok === true
}

/** Whether this message holds a meeting request that was sent (docs/spec.md, "Meeting state"). */
export const hasSuccessfulSend = (message: UIMessage) =>
  message.role === 'assistant' && message.parts.some(isSuccessfulSend)
