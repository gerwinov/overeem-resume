import { convertToModelMessages, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream } from 'ai'
import type { FinishReason, LanguageModel, UIMessage } from 'ai'
import { parseChatRequest } from './chat-request'
import { cleanHistory, hasSuccessfulSend } from './history'
import { createMeetingTool } from './meeting'
import type { SendMeetingEmail } from './meeting'
import { renderSystemPrompt } from './prompt'

// Anthropic first; the other three host the same model and are named in the privacy note.
export const PROVIDERS = ['anthropic', 'claudeaws', 'bedrock', 'vertexAnthropic']
const MAX_OUTPUT_TOKENS = 800
const MAX_MODEL_CALLS = 3

// The client shows its own translated message for this; details never leave the server.
export const CHAT_ERROR = 'chat_error'

export type ChatDeps = {
  model: LanguageModel
  loadContent: () => Promise<{ cv: string, about: string }>
  sendMeetingEmail: SendMeetingEmail
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
    const meetingSent = hasSuccessfulSend(request.messages)
    const tools = {
      request_meeting: createMeetingTool({ alreadySent: meetingSent, locale: request.locale, send: deps.sendMeetingEmail, log }),
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
      // Replaces the SDK's default, which logs the whole error.
      onError: ({ error }) => log(describeError(error)),
    })

    return createUIMessageStreamResponse({
      stream: toUIMessageStream<typeof tools, UIMessage<{ finishReason?: FinishReason }>>({
        stream: result.stream,
        tools,
        messageMetadata: ({ part }) => (part.type === 'finish' ? { finishReason: part.finishReason } : undefined),
        onError: () => CHAT_ERROR,
      }),
    })
  }
  catch (error) {
    // A failure before the stream starts gets the same generic answer as one during it.
    log(describeError(error))
    return Response.json({ error: CHAT_ERROR }, { status: 500 })
  }
}
