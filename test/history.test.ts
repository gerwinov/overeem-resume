import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import { cleanHistory } from '../server/utils/history'

const user = (text: string): UIMessage => ({ id: `u-${text}`, role: 'user', parts: [{ type: 'text', text }] })
const assistant = (id: string, parts: unknown[]): UIMessage => ({ id, role: 'assistant', parts } as UIMessage)
const meeting = (state: string, output?: unknown) => ({ type: 'tool-request_meeting', toolCallId: 't1', state, input: {}, ...(output === undefined ? {} : { output }) })

describe('cleanHistory', () => {
  it('leaves a normal conversation unchanged', () => {
    const messages = [user('Hoi'), assistant('a1', [{ type: 'step-start' }, { type: 'text', text: 'Hallo' }]), user('Wat doet hij?')]
    expect(cleanHistory(messages)).toEqual(messages)
  })

  it('drops a cut-off tool call but keeps the text of other steps', () => {
    const messages = [
      user('Kennismaken'),
      assistant('a1', [{ type: 'step-start' }, { type: 'text', text: 'Dat kan.' }, { type: 'step-start' }, meeting('input-streaming')]),
      user('En?'),
    ]
    expect(cleanHistory(messages)[1]!.parts).toEqual([{ type: 'step-start' }, { type: 'text', text: 'Dat kan.' }])
  })

  it('drops an assistant message whose only content was a cut-off call, and merges the two visitor messages around it', () => {
    const messages = [user('Kennismaken'), assistant('a1', [{ type: 'step-start' }, meeting('input-available')]), user('Hallo?')]
    const cleaned = cleanHistory(messages)
    expect(cleaned).toHaveLength(1)
    expect(cleaned[0]).toMatchObject({ id: 'u-Kennismaken', role: 'user' })
    expect(cleaned[0]!.parts).toEqual([{ type: 'text', text: 'Kennismaken' }, { type: 'text', text: 'Hallo?' }])
  })

  it('merges consecutive messages of the same role, so roles always alternate', () => {
    const messages = [
      user('Een'),
      user('Twee'),
      assistant('a1', [{ type: 'text', text: 'A' }]),
      assistant('a2', [{ type: 'text', text: 'B' }]),
      user('Drie'),
    ]
    const cleaned = cleanHistory(messages)
    expect(cleaned.map(m => m.role)).toEqual(['user', 'assistant', 'user'])
    expect(cleaned[1]!.parts).toEqual([{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }])
  })

  it.each([
    ['only whitespace', [{ type: 'text', text: '   ' }]],
    ['only a step-start', [{ type: 'step-start' }]],
    ['only a streaming tool call', [{ type: 'step-start' }, meeting('input-streaming')]],
  ])('never leaves two visitor messages in a row after dropping an assistant message with %s', (_, parts) => {
    const cleaned = cleanHistory([user('Een'), assistant('a1', parts), user('Twee')])
    expect(cleaned.map(m => m.role)).toEqual(['user'])
  })

  it('keeps a failed call, so the model sees that it failed', () => {
    const failed = meeting('output-error')
    const messages = [user('Kennismaken'), assistant('a1', [{ type: 'step-start' }, failed]), user('En nu?')]
    expect(cleanHistory(messages)[1]!.parts).toEqual([{ type: 'step-start' }, failed])
  })

  it('drops empty text and step-starts without content after them', () => {
    const messages = [user('Hoi'), assistant('a1', [{ type: 'step-start' }, { type: 'text', text: 'Hallo' }, { type: 'step-start' }, { type: 'text', text: '  ' }]), user('?')]
    expect(cleanHistory(messages)[1]!.parts).toEqual([{ type: 'step-start' }, { type: 'text', text: 'Hallo' }])
  })
})
