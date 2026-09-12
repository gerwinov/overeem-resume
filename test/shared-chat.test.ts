import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import { hasSuccessfulSend } from '../shared/utils/chat'

const user = (text: string): UIMessage => ({ id: `u-${text}`, role: 'user', parts: [{ type: 'text', text }] })
const assistant = (parts: unknown[]): UIMessage => ({ id: 'a', role: 'assistant', parts } as UIMessage)
const meeting = (state: string, output?: unknown) => ({ type: 'tool-request_meeting', toolCallId: 't1', state, input: {}, ...(output === undefined ? {} : { output }) })

describe('hasSuccessfulSend', () => {
  it('is true only for an answer with a meeting part with output { ok: true }', () => {
    expect(hasSuccessfulSend(assistant([meeting('output-available', { ok: true })]))).toBe(true)
    expect(hasSuccessfulSend(assistant([meeting('output-available', { ok: false, reason: 'send_failed' })]))).toBe(false)
    expect(hasSuccessfulSend(assistant([meeting('output-error')]))).toBe(false)
    expect(hasSuccessfulSend(assistant([meeting('input-available')]))).toBe(false)
    expect(hasSuccessfulSend(user('x'))).toBe(false)
  })
})
