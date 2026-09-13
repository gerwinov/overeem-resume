import type { UIMessage } from 'ai'
import type { MessagePart } from '../types/chat'

export const isMeetingPart = (part: MessagePart) => part.type === 'tool-request_meeting'

export function isSuccessfulSend(part: MessagePart) {
  if (!isMeetingPart(part) || !('state' in part) || part.state !== 'output-available') return false
  const output = (part as { output?: unknown }).output
  return typeof output === 'object' && output !== null && (output as { ok?: unknown }).ok === true
}

/** Whether this message holds a meeting request that was sent (docs/spec.md, "Meeting state"). */
export const hasSuccessfulSend = (message: UIMessage) =>
  message.role === 'assistant' && message.parts.some(isSuccessfulSend)
