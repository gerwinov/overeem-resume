import type { UIMessage } from 'ai'

type Part = UIMessage['parts'][number]

const isMeetingPart = (part: Part) => part.type === 'tool-request_meeting'

const hasOutput = (part: Part) =>
  'state' in part && (part.state === 'output-available' || part.state === 'output-error')

const isContent = (part: Part) =>
  (part.type === 'text' && part.text.trim().length > 0) || isMeetingPart(part)

/**
 * Prepares the browser's history for the model (docs/spec.md, "API contract"). A tool call without a
 * result, an assistant message without content, and two turns of the same role in a row can each make
 * a provider reject the request.
 */
export function cleanHistory(messages: UIMessage[]): UIMessage[] {
  return mergeSameRole(dropIncomplete(messages))
}

function mergeSameRole(messages: UIMessage[]): UIMessage[] {
  const merged: UIMessage[] = []
  for (const message of messages) {
    const previous = merged.at(-1)
    if (previous?.role === message.role) merged[merged.length - 1] = { ...previous, parts: [...previous.parts, ...message.parts] }
    else merged.push(message)
  }
  return merged
}

function dropIncomplete(messages: UIMessage[]): UIMessage[] {
  const cleaned: UIMessage[] = []
  for (const message of messages) {
    if (message.role !== 'assistant') {
      cleaned.push(message)
      continue
    }

    const parts = message.parts.filter(part => {
      if (isMeetingPart(part)) return hasOutput(part)
      if (part.type === 'text') return part.text.trim().length > 0
      return true
    })

    // A step-start only belongs if content follows it before the next step-start.
    const kept = parts.filter((part, index) => {
      if (part.type !== 'step-start') return true
      const next = parts.slice(index + 1).find(p => p.type === 'step-start' || isContent(p))
      return next !== undefined && next.type !== 'step-start'
    })

    if (kept.some(isContent)) cleaned.push({ ...message, parts: kept })
  }
  return cleaned
}

function isSuccessfulSend(part: Part) {
  if (!isMeetingPart(part) || !('state' in part) || part.state !== 'output-available') return false
  const output = (part as { output?: unknown }).output
  return typeof output === 'object' && output !== null && (output as { ok?: unknown }).ok === true
}

/** Whether an earlier request in this conversation was sent successfully (docs/spec.md, "Meeting state"). */
export function hasSuccessfulSend(messages: UIMessage[]): boolean {
  return messages.some(message => message.role === 'assistant' && message.parts.some(isSuccessfulSend))
}
