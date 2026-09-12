import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream } from 'ai'
import type { FinishReason, ToolSet, UIMessage } from 'ai'

const MODEL = 'anthropic/claude-haiku-4.5'
// Anthropic first; the other three host the same model and are named in the privacy note.
const PROVIDERS = ['anthropic', 'claudeaws', 'bedrock', 'vertexAnthropic']
const MAX_OUTPUT_TOKENS = 800
// A body above this cannot be valid under the limits in parseChatRequest, so reading stops there.
const MAX_BODY_BYTES = 200_000

// The client shows its own translated message for this; details never leave the server.
const CHAT_ERROR = 'chat_error'

// Only the error's type and status go to the runtime logs, never its message or any content.
function logError(error: unknown) {
  const status = typeof error === 'object' && error !== null && 'statusCode' in error ? error.statusCode : undefined
  console.error(`[chat] ${error instanceof Error ? error.name : typeof error}${typeof status === 'number' ? ` (${status})` : ''}`)
}

export default defineEventHandler(async (event) => {
  const raw = await readLimited(event.node.req, MAX_BODY_BYTES)
  if (raw === null) {
    // The rest of the oversized body is never read, so the connection is not reused.
    setResponseHeader(event, 'connection', 'close')
    setResponseStatus(event, 400)
    return { error: 'invalid_request' }
  }

  let body: unknown = null
  try {
    body = JSON.parse(raw)
  }
  catch {
    // Malformed JSON is rejected below like any other invalid body.
  }

  const request = parseChatRequest(body)
  if (!request) {
    setResponseStatus(event, 400)
    return { error: 'invalid_request' }
  }

  try {
    const instructions = await buildSystemPrompt({
      locale: request.locale,
      meetingSent: hasSuccessfulSend(request.messages),
      now: new Date(),
    })

    const result = streamText({
      model: MODEL,
      instructions,
      messages: await convertToModelMessages(cleanHistory(request.messages)),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      providerOptions: { gateway: { order: PROVIDERS, only: PROVIDERS, disallowPromptTraining: true } },
      // Replaces the SDK's default, which logs the whole error.
      onError: ({ error }) => logError(error),
    })

    return createUIMessageStreamResponse({
      stream: toUIMessageStream<ToolSet, UIMessage<{ finishReason?: FinishReason }>>({
        stream: result.stream,
        messageMetadata: ({ part }) => (part.type === 'finish' ? { finishReason: part.finishReason } : undefined),
        onError: () => CHAT_ERROR,
      }),
    })
  }
  catch (error) {
    // A failure before the stream starts gets the same generic answer as one during it.
    logError(error)
    setResponseStatus(event, 500)
    return { error: CHAT_ERROR }
  }
})
