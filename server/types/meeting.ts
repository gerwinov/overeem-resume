import type { z } from 'zod'
import type { Locale } from '#shared/types/chat'
import type { meetingInputSchema } from '../utils/meeting'

export type MeetingRequest = z.infer<typeof meetingInputSchema>

export type SendMeetingEmail = (request: MeetingRequest, locale: Locale) => Promise<void>
