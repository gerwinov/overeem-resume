import type { LanguageModel, Telemetry } from 'ai'
import type { Locale } from '#shared/types/chat'
import type { SendMeetingEmail } from './meeting'

export type ChatTracing = {
  integration: Telemetry
  flush: () => Promise<void>
}

/** What handleChat needs from the outside world, so tests can pass a mock model and send nothing. */
export type ChatDeps = {
  model: LanguageModel
  loadContent: () => Promise<{ cv: string, about: string }>
  sendMeetingEmail: SendMeetingEmail
  tracing?: (context: { chatId: string, locale: Locale }) => ChatTracing | undefined
  waitUntil?: (promise: Promise<unknown>) => void
  now?: () => Date
  log?: (line: string) => void
}
