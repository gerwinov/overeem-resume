import type { ChatStatus } from 'ai'
import type { CvChatMessage, MessagePart } from '../../shared/types/chat'
import { hasSuccessfulSend, isMeetingPart, isSuccessfulSend } from '../../shared/utils/chat'
import { NOTICE_KEYS } from '../constants/chat'
import type { AssistantBlock, ChatErrorKind, ThreadItem } from '../types/chat'

/** Retrying regenerates the last answer; one with a successful send never is, so nothing is sent twice. */
export function canRetry(history: CvChatMessage[]) {
  const last = history.at(-1)
  return !(last && hasSuccessfulSend(last))
}

/** Splits an assistant message into its steps; every step-start begins a new one. */
function steps(message: CvChatMessage): MessagePart[][] {
  const result: MessagePart[][] = [[]]
  for (const part of message.parts) {
    if (part.type === 'step-start') {
      if (result.at(-1)!.length > 0) result.push([])
    }
    else result.at(-1)!.push(part)
  }
  return result.filter(step => step.length > 0)
}

/**
 * A failed turn: a stream error, or a finish reason other than stop,
 * length or tool-calls; tool-calls only counts as a normal ending when the turn holds a successful send.
 * A finished answer with nothing to show fails too, so a turn never ends empty.
 */
export function isFailedTurn(message: CvChatMessage, erroredIds: ReadonlySet<string>) {
  if (message.role !== 'assistant') return false
  if (erroredIds.has(message.id)) return true
  const reason = message.metadata?.finishReason
  if (reason === undefined) return false
  if (reason === 'stop' || reason === 'length') return assistantBlocks(message, false).length === 0
  if (reason === 'tool-calls') return !hasSuccessfulSend(message)
  return true
}

/** The ids of turns that ended in a stream error, plus an unfinished last answer while the chat is in its error state. */
export function erroredTurnIds(messages: CvChatMessage[], status: ChatStatus, erroredIds: ReadonlySet<string>): ReadonlySet<string> {
  const last = messages.at(-1)
  if (status !== 'error' || last?.role !== 'assistant' || last.metadata?.finishReason !== undefined || erroredIds.has(last.id)) return erroredIds
  return new Set(erroredIds).add(last.id)
}

/** Answers are plain text; bold markers the model writes anyway would show as literal asterisks. */
const withoutBold = (text: string) => text.replaceAll('**', '')

/**
 * The visible blocks of an assistant message. Text in a step that also calls the tool is never shown,
 * whatever the order: it was written before any tool result existed. A successful send shows a fixed
 * confirmation line instead. A failed turn keeps only its confirmation line.
 */
export function assistantBlocks(message: CvChatMessage, failed: boolean): AssistantBlock[] {
  const blocks: AssistantBlock[] = []
  for (const step of steps(message)) {
    if (step.some(isMeetingPart)) {
      if (step.some(isSuccessfulSend)) blocks.push({ kind: 'meeting-sent' })
      continue
    }
    if (failed) continue
    const text = withoutBold(step.filter(part => part.type === 'text').map(part => (part as { text: string }).text).join(''))
    if (text.trim()) blocks.push({ kind: 'text', text })
  }
  return blocks
}

export function buildThread(options: {
  messages: CvChatMessage[]
  status: ChatStatus
  erroredIds: ReadonlySet<string>
  errorKind: ChatErrorKind | null
}): ThreadItem[] {
  const { messages, status, errorKind } = options
  const erroredIds = erroredTurnIds(messages, status, options.erroredIds)
  const items: ThreadItem[] = []
  let previousWasAssistant = false
  let lastHasNotice = false
  const last = messages.at(-1)

  for (const message of messages) {
    if (message.role === 'user') {
      const text = message.parts.filter(part => part.type === 'text').map(part => (part as { text: string }).text).join('')
      items.push({ kind: 'user', id: message.id, text })
      previousWasAssistant = false
      continue
    }
    if (message.role !== 'assistant') continue

    const isLast = message === last
    const failed = isFailedTurn(message, erroredIds)
    const streaming = isLast && status === 'streaming'
    const blocks = assistantBlocks(message, failed)
    if (blocks.length > 0 || streaming) {
      items.push({
        kind: 'assistant',
        id: message.id,
        blocks,
        showWho: !previousWasAssistant,
        streaming,
        cutOff: !failed && message.metadata?.finishReason === 'length',
      })
      previousWasAssistant = true
    }
    if (failed && !streaming) {
      // The notice for a failed last turn comes from the chat's error state below, unless it holds a send.
      if (hasSuccessfulSend(message)) {
        items.push({ kind: 'notice', notice: 'error-after-send', retry: false })
        if (isLast) lastHasNotice = true
      }
      else if (!(isLast && status === 'error')) items.push({ kind: 'notice', notice: 'error', retry: isLast })
    }
  }

  if (last?.role === 'user' && status === 'submitted') items.push({ kind: 'pending', showWho: true })
  if (status === 'error' && !lastHasNotice) {
    items.push(errorKind === 'rate_limited'
      ? { kind: 'notice', notice: 'rate-limited', retry: false }
      : { kind: 'notice', notice: 'error', retry: canRetry(messages) })
  }
  return items
}

export type AnnouncementKey = 'meetingSent' | 'cutoff' | 'error' | 'errorAfterSend' | 'rateLimit'

/**
 * What the live region reads out once a turn has ended: everything after the visitor's last message,
 * in thread order. `label` turns fixed lines into UI copy.
 */
export function turnAnnouncement(items: ThreadItem[], label: (key: AnnouncementKey) => string): string {
  const lastUser = items.findLastIndex(item => item.kind === 'user')
  const parts: string[] = []
  for (const item of items.slice(lastUser + 1)) {
    if (item.kind === 'assistant') {
      for (const block of item.blocks) parts.push(block.kind === 'text' ? block.text : label('meetingSent'))
      if (item.cutOff) parts.push(label('cutoff'))
    }
    else if (item.kind === 'notice') parts.push(label(NOTICE_KEYS[item.notice]))
  }
  return parts.join(' ')
}
