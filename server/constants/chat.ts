// Anthropic first; the other three host the same model and are named in the privacy note.
export const PROVIDERS = ['anthropic', 'claudeaws', 'bedrock', 'vertexAnthropic']

// Limit from docs/spec.md, "Safety & cost"; the limits the page also knows are in shared/constants.
export const MAX_HISTORY_CHARS = 30_000
