// The /api/chat limits from docs/spec.md, "Safety & cost": the server enforces them, the page only
// avoids hitting them.
export const MAX_MESSAGES = 30
export const MAX_VISITOR_MESSAGE_CHARS = 1000

export const LOCALES = ['nl', 'en'] as const
