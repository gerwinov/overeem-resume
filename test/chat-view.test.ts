import { describe, expect, it } from 'vitest'
import { buildThread, canRetry, erroredTurnIds, isFailedTurn, turnAnnouncement } from '../app/utils/chat-view'
import type { CvChatMessage } from '../shared/utils/chat'

const user = (id: string, text: string): CvChatMessage => ({ id, role: 'user', parts: [{ type: 'text', text }] })
const assistant = (id: string, parts: unknown[], finishReason?: string): CvChatMessage =>
  ({ id, role: 'assistant', parts, metadata: finishReason ? { finishReason } : undefined } as CvChatMessage)
const text = (value: string) => ({ type: 'text', text: value })
const step = { type: 'step-start' }
const sent = { type: 'tool-request_meeting', toolCallId: 't1', state: 'output-available', input: {}, output: { ok: true } }
const notSent = { type: 'tool-request_meeting', toolCallId: 't1', state: 'output-available', input: {}, output: { ok: false, reason: 'send_failed' } }
const none = new Set<string>()

const thread = (messages: CvChatMessage[], status: 'ready' | 'submitted' | 'streaming' | 'error' = 'ready', erroredIds: Set<string> = none, errorKind: 'error' | 'rate_limited' | null = null) =>
  buildThread({ messages, status, erroredIds, errorKind })

describe('buildThread', () => {
  it('shows visitor messages and answers, with the assistant label once per run of answers', () => {
    const items = thread([user('u1', 'Hoi'), assistant('a1', [step, text('Hallo!')], 'stop')])
    expect(items).toEqual([
      { kind: 'user', id: 'u1', text: 'Hoi' },
      { kind: 'assistant', id: 'a1', blocks: [{ kind: 'text', text: 'Hallo!' }], showWho: true, streaming: false, cutOff: false },
    ])
  })

  it('hides text from a step with a tool call and shows the confirmation line and the next step', () => {
    const items = thread([user('u1', 'Ja'), assistant('a1', [step, text('Ik verstuur het nu.'), sent, step, text('Verstuurd!')], 'stop')])
    expect(items[1]).toMatchObject({ blocks: [{ kind: 'meeting-sent' }, { kind: 'text', text: 'Verstuurd!' }] })
  })

  it('hides text written after the tool call in the same step, too', () => {
    const items = thread([user('u1', 'Ja'), assistant('a1', [step, notSent, text('Het is verstuurd!'), step, text('Het lukte helaas niet.')], 'stop')])
    expect(items[1]).toMatchObject({ blocks: [{ kind: 'text', text: 'Het lukte helaas niet.' }] })
  })

  it('removes bold markers from answers, also from an unclosed one while streaming', () => {
    expect(thread([user('u1', 'Hoi'), assistant('a1', [step, text('**Python:** geen ervaring')], 'stop')])[1])
      .toMatchObject({ blocks: [{ kind: 'text', text: 'Python: geen ervaring' }] })
    expect(thread([user('u1', 'Hoi'), assistant('a1', [step, text('**Pyth')])], 'streaming')[1])
      .toMatchObject({ blocks: [{ kind: 'text', text: 'Pyth' }] })
  })

  it('shows thinking dots while waiting for the first response', () => {
    expect(thread([user('u1', 'Hoi')], 'submitted').at(-1)).toEqual({ kind: 'pending', showWho: true })
  })

  it('marks the last answer as streaming', () => {
    expect(thread([user('u1', 'Hoi'), assistant('a1', [step, text('Hal')])], 'streaming')[1]).toMatchObject({ streaming: true })
  })

  it('adds a cut-off note for a finish reason of length', () => {
    expect(thread([user('u1', 'Vertel alles'), assistant('a1', [step, text('Heel lang…')], 'length')])[1]).toMatchObject({ cutOff: true })
  })

  it('shows a failed turn as an error with retry, without its partial text', () => {
    const items = thread([user('u1', 'Hoi'), assistant('a1', [step, text('Half antw')])], 'error', new Set(['a1']))
    expect(items.slice(1)).toEqual([{ kind: 'notice', notice: 'error', retry: true }])
  })

  it.each(['content-filter', 'error', 'other', 'something-new'])('treats finish reason %s as a failed turn', (reason) => {
    expect(thread([user('u1', 'Hoi'), assistant('a1', [step, text('x')], reason)]).at(-1)).toEqual({ kind: 'notice', notice: 'error', retry: true })
  })

  it('treats tool-calls with a successful send as normal, and without one as failed', () => {
    const ok = thread([user('u1', 'Ja'), assistant('a1', [step, sent], 'tool-calls')])
    expect(ok.at(-1)).toMatchObject({ kind: 'assistant', blocks: [{ kind: 'meeting-sent' }] })
    const failed = thread([user('u1', 'Ja'), assistant('a1', [step, notSent], 'tool-calls')])
    expect(failed.at(-1)).toEqual({ kind: 'notice', notice: 'error', retry: true })
  })

  it('keeps the confirmation line of a failed turn and offers no retry for it', () => {
    const items = thread([user('u1', 'Ja'), assistant('a1', [step, sent, step, text('Verst')])], 'error', new Set(['a1']))
    expect(items.slice(1)).toEqual([
      { kind: 'assistant', id: 'a1', blocks: [{ kind: 'meeting-sent' }], showWho: true, streaming: false, cutOff: false },
      { kind: 'notice', notice: 'error-after-send', retry: false },
    ])
  })

  it('shows an error with retry when the request failed before any answer', () => {
    expect(thread([user('u1', 'Hoi')], 'error', none, 'error').at(-1)).toEqual({ kind: 'notice', notice: 'error', retry: true })
  })

  it('shows the last answer as failed while the chat is in its error state, even without an error mark', () => {
    const items = thread([user('u1', 'Hoi'), assistant('a1', [step, text('Half antw')])], 'error')
    expect(items).toEqual([
      { kind: 'user', id: 'u1', text: 'Hoi' },
      { kind: 'notice', notice: 'error', retry: true },
    ])
  })

  it('shows the rate-limit notice without retry after a 429', () => {
    expect(thread([user('u1', 'Hoi')], 'error', none, 'rate_limited').at(-1)).toEqual({ kind: 'notice', notice: 'rate-limited', retry: false })
  })

  it('shows the rate-limit notice once, also when an unfinished answer is last', () => {
    const items = thread([user('u1', 'Hoi'), assistant('a1', [step])], 'error', none, 'rate_limited')
    expect(items.slice(1)).toEqual([{ kind: 'notice', notice: 'rate-limited', retry: false }])
  })

  it('treats a finished answer with nothing to show as failed, such as one cut off inside a tool call', () => {
    const cutInCall = { type: 'tool-request_meeting', toolCallId: 't1', state: 'input-streaming', input: {} }
    expect(thread([user('u1', 'Ja'), assistant('a1', [step, text('Ik verstuur'), cutInCall], 'length')]).slice(1))
      .toEqual([{ kind: 'notice', notice: 'error', retry: true }])
    expect(thread([user('u1', 'Hoi'), assistant('a1', [step], 'stop')]).slice(1))
      .toEqual([{ kind: 'notice', notice: 'error', retry: true }])
  })

  it('still shows the error notice after a completed send when a later request fails', () => {
    const items = thread([user('u1', 'Ja'), assistant('a1', [step, sent, step, text('Verstuurd!')], 'stop')], 'error', none, 'rate_limited')
    expect(items.slice(1)).toEqual([
      { kind: 'assistant', id: 'a1', blocks: [{ kind: 'meeting-sent' }, { kind: 'text', text: 'Verstuurd!' }], showWho: true, streaming: false, cutOff: false },
      { kind: 'notice', notice: 'rate-limited', retry: false },
    ])
  })

  it('offers no retry after a completed send when a later request fails, so nothing is sent twice', () => {
    const items = thread([user('u1', 'Ja'), assistant('a1', [step, sent, step, text('Verstuurd!')], 'stop')], 'error', none, 'error')
    expect(items.at(-1)).toEqual({ kind: 'notice', notice: 'error', retry: false })
  })

  it('keeps a finished last answer visible when the chat is in its error state', () => {
    const items = thread([user('u1', 'Hoi'), assistant('a1', [step, text('Hallo!')], 'stop')], 'error', none, 'error')
    expect(items.slice(1)).toEqual([
      { kind: 'assistant', id: 'a1', blocks: [{ kind: 'text', text: 'Hallo!' }], showWho: true, streaming: false, cutOff: false },
      { kind: 'notice', notice: 'error', retry: true },
    ])
  })
})

describe('isFailedTurn', () => {
  it('is never true for a visitor message or an unfinished answer', () => {
    expect(isFailedTurn(user('u1', 'x'), none)).toBe(false)
    expect(isFailedTurn(assistant('a1', [text('x')]), none)).toBe(false)
  })
})

describe('erroredTurnIds', () => {
  it('adds an unfinished last answer only while the chat is in its error state', () => {
    const messages = [user('u1', 'Hoi'), assistant('a1', [text('x')])]
    expect(erroredTurnIds(messages, 'error', none)).toEqual(new Set(['a1']))
    expect(erroredTurnIds(messages, 'ready', none)).toBe(none)
    expect(erroredTurnIds([user('u1', 'Hoi')], 'error', none)).toBe(none)
    expect(erroredTurnIds([user('u1', 'Hoi'), assistant('a1', [text('x')], 'stop')], 'error', none)).toBe(none)
  })
})

describe('canRetry', () => {
  it('never regenerates an answer holding a successful send', () => {
    expect(canRetry([user('u1', 'Ja'), assistant('a1', [step, sent], 'tool-calls')])).toBe(false)
    expect(canRetry([user('u1', 'Ja'), assistant('a1', [step, notSent], 'tool-calls')])).toBe(true)
    expect(canRetry([user('u1', 'Ja')])).toBe(true)
  })
})

describe('turnAnnouncement', () => {
  const label = (key: string) => `<${key}>`

  it('reads only the last turn: its answer, confirmation line and cut-off note', () => {
    const items = thread([
      user('u1', 'Hoi'), assistant('a1', [step, text('Eerder antwoord')], 'stop'),
      user('u2', 'Ja'), assistant('a2', [step, sent, step, text('Verstuurd, Gerwin')], 'length'),
    ])
    expect(turnAnnouncement(items, label)).toBe('<meetingSent> Verstuurd, Gerwin <cutoff>')
  })

  it('reads the error or rate-limit message when there is no answer', () => {
    expect(turnAnnouncement(thread([user('u1', 'Hoi')], 'error', none, 'rate_limited'), label)).toBe('<rateLimit>')
    expect(turnAnnouncement(thread([user('u1', 'Hoi'), assistant('a1', [step, text('Half')])], 'error', none, 'error'), label)).toBe('<error>')
  })
})
