import { Client } from 'langsmith'
import { LangSmithTelemetry } from 'langsmith/experimental/vercel'
import type { Telemetry } from 'ai'
import type { Locale } from '../../shared/types/chat'
import type { ChatTracing } from '../types/chat'

/**
 * A LangSmith integration for one chat request, so every trace carries its conversation's ID as
 * `thread_id` and LangSmith's thread view shows the whole conversation. Each request gets its own
 * client, so its flush waits only for its own trace, not for other requests on the same instance.
 * Off unless LANGSMITH_TRACING is "true" and a key is set.
 */
export function langsmithTracing(context: { chatId: string, locale: Locale }): ChatTracing | undefined {
  if (process.env.LANGSMITH_TRACING !== 'true' || !process.env.LANGSMITH_API_KEY) return undefined

  // Reads LANGSMITH_API_KEY, LANGSMITH_ENDPOINT and LANGSMITH_PROJECT.
  const client = new Client()
  return {
    integration: LangSmithTelemetry({
      client,
      // The name of each trace; the project it goes into is LANGSMITH_PROJECT.
      name: 'chat-turn',
      metadata: { thread_id: context.chatId, locale: context.locale },
    }) as Telemetry,
    flush: () => client.awaitPendingTraceBatches(),
  }
}
