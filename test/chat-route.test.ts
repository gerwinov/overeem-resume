import { describe, expect, it, vi } from 'vitest'
import { MockLanguageModelV4, simulateReadableStream } from 'ai/test'
import { handleChat, PROVIDERS } from '../server/utils/chat'
import type { ChatDeps } from '../server/utils/chat'
import type { MeetingRequest } from '../server/utils/meeting'

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}
const finish = (unified: string) => ({ type: 'finish', finishReason: { unified, raw: undefined }, usage })
const textStep = (text: string) => [
  { type: 'text-start', id: 't' },
  { type: 'text-delta', id: 't', delta: text },
  { type: 'text-end', id: 't' },
  finish('stop'),
]
const toolStep = (...inputs: unknown[]) => [
  ...inputs.map((input, index) => ({ type: 'tool-call', toolCallId: `call-${index}`, toolName: 'request_meeting', input: JSON.stringify(input) })),
  finish('tool-calls'),
]

/** A model that plays the given steps in order, one per model call. */
function scriptedModel(...steps: unknown[][]) {
  let call = 0
  return new MockLanguageModelV4({
    doStream: async () => ({ stream: simulateReadableStream({ chunks: steps[Math.min(call++, steps.length - 1)] as never[] }) }),
  })
}

const meeting: MeetingRequest = { name: 'Sanne de Vries', email: 'sanne@voorbeeld.nl', message: 'Graag een kennismaking.' }

const body = (messages: unknown[] = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Ja, verstuur maar.' }] }]) => ({ locale: 'nl', messages })

function deps(model: MockLanguageModelV4, overrides: Partial<ChatDeps> = {}) {
  return {
    model,
    loadContent: async () => ({ cv: '# Profiel\nDummy CV', about: 'Dummy about' }),
    sendMeetingEmail: vi.fn(async () => {}),
    log: vi.fn(),
    now: () => new Date('2026-09-12T10:00:00Z'),
    ...overrides,
  } satisfies ChatDeps
}

async function events(response: Response) {
  return (await response.text())
    .split('\n')
    .filter(line => line.startsWith('data: ') && line !== 'data: [DONE]')
    .map(line => JSON.parse(line.slice('data: '.length)))
}

const toolOutputs = (list: { type: string, output?: unknown }[]) =>
  list.filter(event => event.type === 'tool-output-available').map(event => event.output)

describe('handleChat: the route', () => {
  it('rejects an invalid body with 400, without calling the model', async () => {
    const model = scriptedModel(textStep('Hallo'))
    const response = await handleChat({ locale: 'nl', messages: [] }, deps(model))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'invalid_request' })
    expect(model.doStreamCalls).toHaveLength(0)
  })

  it('streams the answer and attaches the finish reason as message metadata', async () => {
    const list = await events(await handleChat(body(), deps(scriptedModel(textStep('Hallo!')))))
    expect(list.filter(e => e.type === 'text-delta').map(e => e.delta).join('')).toBe('Hallo!')
    expect(list.find(e => e.type === 'finish')?.messageMetadata).toEqual({ finishReason: 'stop' })
  })

  it('sends the gateway options, the output cap and the system prompt to the model', async () => {
    const model = scriptedModel(textStep('Hallo'))
    await events(await handleChat(body(), deps(model)))
    const call = model.doStreamCalls[0]!
    expect(call.providerOptions?.gateway).toEqual({ order: PROVIDERS, only: PROVIDERS, disallowPromptTraining: true })
    expect(call.maxOutputTokens).toBe(800)
    expect(call.prompt[0]).toMatchObject({ role: 'system' })
    expect(JSON.stringify(call.prompt[0])).toContain('<cv>')
  })

  it('turns a model error into the generic code and logs only its type', async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => {
        throw new Error('secret provider detail')
      },
    })
    const d = deps(model)
    const list = await events(await handleChat(body(), d))
    expect(list).toContainEqual({ type: 'error', errorText: 'chat_error' })
    const lines = d.log.mock.calls.map(([line]) => line)
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      expect(line).toMatch(/^\[chat\] /)
      expect(line).not.toContain('secret')
    }
  })

  it('answers 500 with the generic code when the prompt cannot be built', async () => {
    const d = deps(scriptedModel(textStep('Hallo')), { loadContent: async () => { throw new Error('missing file') } })
    const response = await handleChat(body(), d)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'chat_error' })
  })
})

describe('handleChat: the meeting tool', () => {
  it('sends one email for a valid call and lets the model answer afterwards', async () => {
    const model = scriptedModel(toolStep(meeting), textStep('Verstuurd.'))
    const d = deps(model)
    const list = await events(await handleChat(body(), d))
    expect(d.sendMeetingEmail).toHaveBeenCalledTimes(1)
    expect(d.sendMeetingEmail).toHaveBeenCalledWith(meeting, 'nl')
    expect(toolOutputs(list)).toEqual([{ ok: true }])
    expect(model.doStreamCalls).toHaveLength(2)
  })

  it('sends at most one email when the model calls the tool twice in parallel', async () => {
    const d = deps(scriptedModel(toolStep(meeting, meeting), textStep('Verstuurd.')), {
      sendMeetingEmail: vi.fn(() => new Promise<void>(resolve => setTimeout(resolve, 20))),
    })
    const outputs = toolOutputs(await events(await handleChat(body(), d)))
    expect(d.sendMeetingEmail).toHaveBeenCalledTimes(1)
    expect(outputs).toContainEqual({ ok: true })
    expect(outputs).toHaveLength(2)
    expect(outputs.filter(o => (o as { ok: boolean }).ok)).toHaveLength(1)
  })

  it('returns already_sent without sending when the history holds a successful send', async () => {
    const history = [
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Ja' }] },
      { id: 'a1', role: 'assistant', parts: [{ type: 'step-start' }, { type: 'tool-request_meeting', toolCallId: 'old', state: 'output-available', input: meeting, output: { ok: true } }, { type: 'step-start' }, { type: 'text', text: 'Verstuurd.' }] },
      { id: 'u2', role: 'user', parts: [{ type: 'text', text: 'Stuur hem nog een keer' }] },
    ]
    const d = deps(scriptedModel(toolStep(meeting), textStep('Dat is al gedaan.')))
    const outputs = toolOutputs(await events(await handleChat(body(history), d)))
    expect(d.sendMeetingEmail).not.toHaveBeenCalled()
    expect(outputs).toEqual([{ ok: false, reason: 'already_sent' }])
  })

  it('lets the model retry after a failed send', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(undefined)
    const d = deps(scriptedModel(toolStep(meeting), toolStep(meeting), textStep('Nu gelukt.')), { sendMeetingEmail: send })
    const outputs = toolOutputs(await events(await handleChat(body(), d)))
    expect(send).toHaveBeenCalledTimes(2)
    expect(outputs).toEqual([{ ok: false, reason: 'send_failed' }, { ok: true }])
    expect(d.log.mock.calls.map(([line]) => line)).toContain('[meeting] send failed')
  })

  it('never sends for an invalid call', async () => {
    const d = deps(scriptedModel(toolStep({ ...meeting, email: 'sanne@voorbeeld.nl,x@example.com' }), textStep('Welk adres?')))
    const list = await events(await handleChat(body(), d))
    expect(d.sendMeetingEmail).not.toHaveBeenCalled()
    expect(toolOutputs(list)).toEqual([])
  })

  it('makes the third model call answer in text only', async () => {
    const model = scriptedModel(toolStep(meeting), toolStep(meeting), textStep('Het lukt niet.'))
    const d = deps(model, { sendMeetingEmail: vi.fn(async () => { throw new Error('down') }) })
    await events(await handleChat(body(), d))
    expect(model.doStreamCalls).toHaveLength(3)
    expect(model.doStreamCalls[0]!.toolChoice).toEqual({ type: 'auto' })
    expect(model.doStreamCalls[2]!.toolChoice).toEqual({ type: 'none' })
  })
})
