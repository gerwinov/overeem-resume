import { convertToModelMessages, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream } from 'ai'
import type { LanguageModel } from 'ai'
import { hasSuccessfulSend } from '../../shared/utils/chat'
import type { CvChatMessage, Locale } from '../../shared/utils/chat'
import { parseChatRequest } from './chat-request'
import type { ChatTracing } from './tracing'
import { cleanHistory } from './history'
import { createMeetingTool } from './meeting'
import type { SendMeetingEmail } from './meeting'
import { renderSystemPrompt } from './prompt'

// Anthropic first; the other three host the same model and are named in the privacy note.
export const PROVIDERS = ['anthropic', 'claudeaws', 'bedrock', 'vertexAnthropic']
const MAX_OUTPUT_TOKENS = 800
const MAX_MODEL_CALLS = 3

// The client shows its own translated message for this; details never leave the server.
export const CHAT_ERROR = 'chat_error'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms).unref?.())

/**
 * Sends a request's trace once its stream has ended. Never rejects: a trace that cannot be sent, or
 * that takes too long, is logged and dropped. The caps bound how long waitUntil keeps the function
 * alive; the first is a safety net in case the stream's end is never signalled.
 */
export async function flushTrace(options: {
  streamEnded: Promise<void>
  flush: () => Promise<void>
  log: (line: string) => void
  streamEndTimeoutMs?: number
  flushTimeoutMs?: number
}): Promise<void> {
  const { streamEnded, flush, log, streamEndTimeoutMs = 120_000, flushTimeoutMs = 10_000 } = options
  await Promise.race([streamEnded, sleep(streamEndTimeoutMs)])

  let flushing: Promise<void>
  try {
    // The handler is attached before the race, so a flush that fails after the timeout is still handled.
    flushing = flush().catch(() => log('[chat] trace not sent'))
  }
  catch {
    log('[chat] trace not sent')
    return
  }
  await Promise.race([flushing, sleep(flushTimeoutMs)])
}

export type ChatDeps = {
  model: LanguageModel
  loadContent: () => Promise<{ cv: string, about: string }>
  sendMeetingEmail: SendMeetingEmail
  tracing?: (context: { chatId: string, locale: Locale }) => ChatTracing | undefined
  waitUntil?: (promise: Promise<unknown>) => void
  now?: () => Date
  log?: (line: string) => void
}

// Only the error's type and status go to the runtime logs, never its message or any content.
export function describeError(error: unknown) {
  const status = typeof error === 'object' && error !== null && 'statusCode' in error ? error.statusCode : undefined
  return `[chat] ${error instanceof Error ? error.name : typeof error}${typeof status === 'number' ? ` (${status})` : ''}`
}

export async function handleChat(body: unknown, deps: ChatDeps): Promise<Response> {
  const request = parseChatRequest(body)
  if (!request) return Response.json({ error: 'invalid_request' }, { status: 400 })

  const log = deps.log ?? console.error
  try {
    const { cv, about } = await deps.loadContent()
    const meetingSent = request.messages.some(hasSuccessfulSend)
    const tools = {
      request_meeting: createMeetingTool({ alreadySent: meetingSent, locale: request.locale, send: deps.sendMeetingEmail, log }),
    }

    // The trace is sent after the answer, and nothing about tracing may affect the chat: a tracer that
    // fails to start means this request is simply not traced.
    let tracing: ChatTracing | undefined
    try {
      tracing = deps.tracing?.({ chatId: request.chatId, locale: request.locale })
    }
    catch {
      log('[chat] trace not started')
    }
    let streamEnded = () => {}
    if (tracing) {
      const ended = new Promise<void>(resolve => (streamEnded = resolve))
      // The flush runs either way; waitUntil only keeps the function alive until it is done.
      const flushing = flushTrace({ streamEnded: ended, flush: tracing.flush, log })
      deps.waitUntil?.(flushing)
    }

    const result = streamText({
      model: deps.model,
      instructions: renderSystemPrompt({ cv, about, locale: request.locale, meetingSent, now: deps.now?.() ?? new Date() }),
      messages: await convertToModelMessages(cleanHistory(request.messages), { tools }),
      tools,
      stopWhen: isStepCount(MAX_MODEL_CALLS),
      // The last call may only answer in text, so every tool result is followed by an answer.
      prepareStep: ({ stepNumber }) => (stepNumber === MAX_MODEL_CALLS - 1 ? { toolChoice: 'none' } : undefined),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      providerOptions: { gateway: { order: PROVIDERS, only: PROVIDERS, disallowPromptTraining: true } },
      telemetry: tracing ? { integrations: [tracing.integration] } : { isEnabled: false },
      // Replaces the SDK's default, which logs the whole error.
      onError: ({ error }) => log(describeError(error)),
    })

    return createUIMessageStreamResponse({
      stream: toUIMessageStream<typeof tools, CvChatMessage>({
        stream: result.stream,
        tools,
        messageMetadata: ({ part }) => (part.type === 'finish' ? { finishReason: part.finishReason } : undefined),
        onError: () => CHAT_ERROR,
        onEnd: () => streamEnded(),
      }),
    })
  }
  catch (error) {
    // A failure before the stream starts gets the same generic answer as one during it.
    log(describeError(error))
    return Response.json({ error: CHAT_ERROR }, { status: 500 })
  }
}
