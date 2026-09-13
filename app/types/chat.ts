export type ChatErrorKind = 'rate_limited' | 'error'

export type AssistantBlock = { kind: 'text', text: string } | { kind: 'meeting-sent' }

/** One item of the conversation as the page shows it, built from the messages by buildThread. */
export type ThreadItem =
  | { kind: 'user', id: string, text: string }
  | { kind: 'assistant', id: string, blocks: AssistantBlock[], showWho: boolean, streaming: boolean, cutOff: boolean }
  | { kind: 'pending', showWho: boolean }
  | { kind: 'notice', notice: 'error' | 'error-after-send' | 'rate-limited', retry: boolean }
