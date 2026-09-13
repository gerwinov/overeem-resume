import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockLanguageModelV4, simulateReadableStream } from 'ai/test'
import { flushTrace, handleChat } from '../server/utils/chat'
import type { ChatDeps } from '../server/types/chat'
import { langsmithTracing } from '../server/utils/tracing'

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}
const answer = () => new MockLanguageModelV4({
  doStream: async () => ({
    stream: simulateReadableStream({
      chunks: [
        { type: 'text-start', id: 't' },
        { type: 'text-delta', id: 't', delta: 'Hallo' },
        { type: 'text-end', id: 't' },
        { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
      ] as never[],
    }),
  }),
})

const body = (extra: Record<string, unknown> = {}) => ({
  locale: 'en',
  messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] }],
  ...extra,
})

function deps(overrides: Partial<ChatDeps> = {}) {
  const pending: Promise<unknown>[] = []
  return {
    pending,
    deps: {
      model: answer(),
      loadContent: async () => ({ cv: 'CV', about: 'About' }),
      sendMeetingEmail: vi.fn(async () => {}),
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      log: vi.fn(),
      ...overrides,
    } satisfies ChatDeps,
  }
}

describe('handleChat: conversation log', () => {
  it('traces with the chat ID and the site language, and flushes after the stream ends', async () => {
    const onStart = vi.fn()
    const flush = vi.fn(async () => {})
    const tracing = vi.fn(() => ({ integration: { onStart }, flush }))
    const { deps: d, pending } = deps({ tracing })

    const response = await handleChat(body({ id: 'chat-abc_123' }), d)
    expect(tracing).toHaveBeenCalledWith({ chatId: 'chat-abc_123', locale: 'en' })
    expect(flush).not.toHaveBeenCalled()

    await response.text()
    await Promise.all(pending)
    expect(onStart).toHaveBeenCalled()
    expect(flush).toHaveBeenCalledTimes(1)
  })

  it('still flushes when no waitUntil is available', async () => {
    const flush = vi.fn(async () => {})
    const { deps: d } = deps({ tracing: () => ({ integration: {}, flush }), waitUntil: undefined })
    await (await handleChat(body(), d)).text()
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(flush).toHaveBeenCalledTimes(1)
  })

  it('gives a request without an ID its own random thread', async () => {
    const tracing = vi.fn<NonNullable<ChatDeps['tracing']>>(() => undefined)
    await (await handleChat(body(), deps({ tracing }).deps)).text()
    expect(tracing.mock.calls[0]![0].chatId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('replaces a malformed chat ID with a fresh one instead of rejecting the request', async () => {
    for (const id of ['has spaces', 'x'.repeat(65), '../etc', 42]) {
      const tracing = vi.fn<NonNullable<ChatDeps['tracing']>>(() => undefined)
      const response = await handleChat(body({ id }), deps({ tracing }).deps)
      expect(response.status).toBe(200)
      await response.text()
      expect(tracing.mock.calls[0]![0].chatId).toMatch(/^[0-9a-f-]{36}$/)
    }
  })

  it('keeps the chat working when the tracer fails to start', async () => {
    const { deps: d } = deps({ tracing: () => { throw new Error('bad endpoint') } })
    const response = await handleChat(body(), d)
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Hallo')
    expect(d.log).toHaveBeenCalledWith('[chat] trace not started')
  })

  it('keeps the chat working when the trace cannot be sent', async () => {
    const flush = vi.fn(async () => { throw new Error('LangSmith down') })
    const { deps: d, pending } = deps({ tracing: () => ({ integration: {}, flush }) })
    const text = await (await handleChat(body(), d)).text()
    await Promise.all(pending)
    expect(text).toContain('Hallo')
    expect(d.log).toHaveBeenCalledWith('[chat] trace not sent')
  })
})

describe('flushTrace', () => {
  it('waits for the stream to end before flushing', async () => {
    let end = () => {}
    const flush = vi.fn(async () => {})
    const done = flushTrace({ streamEnded: new Promise<void>(resolve => (end = resolve)), flush, log: vi.fn() })
    await new Promise(resolve => setTimeout(resolve, 5))
    expect(flush).not.toHaveBeenCalled()
    end()
    await done
    expect(flush).toHaveBeenCalledTimes(1)
  })

  it('handles a flush that fails after its time limit, without an unhandled rejection', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    const log = vi.fn()
    const lateFailure = () => new Promise<void>((_, reject) => setTimeout(() => reject(new Error('LangSmith down')), 30))

    await flushTrace({ streamEnded: Promise.resolve(), flush: lateFailure, log, flushTimeoutMs: 5 })
    await new Promise(resolve => setTimeout(resolve, 60))

    process.off('unhandledRejection', unhandled)
    expect(unhandled).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('[chat] trace not sent')
  })

  it('handles a flush that throws synchronously', async () => {
    const log = vi.fn()
    await flushTrace({ streamEnded: Promise.resolve(), flush: () => { throw new Error('boom') }, log })
    expect(log).toHaveBeenCalledWith('[chat] trace not sent')
  })
})

describe('langsmithTracing', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('is off unless LANGSMITH_TRACING is "true" and a key is set', () => {
    vi.stubEnv('LANGSMITH_TRACING', 'false')
    vi.stubEnv('LANGSMITH_API_KEY', 'key')
    expect(langsmithTracing({ chatId: 'c', locale: 'nl' })).toBeUndefined()
    vi.stubEnv('LANGSMITH_TRACING', 'true')
    vi.stubEnv('LANGSMITH_API_KEY', '')
    expect(langsmithTracing({ chatId: 'c', locale: 'nl' })).toBeUndefined()
  })
})
