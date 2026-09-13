import type { FinishReason, UIMessage } from 'ai'
import type { LOCALES } from '../constants/chat'

export type Locale = (typeof LOCALES)[number]

/** A message as /api/chat streams it: the final finish reason arrives as metadata. */
export type CvChatMessage = UIMessage<{ finishReason?: FinishReason }>

export type MessagePart = UIMessage['parts'][number]
