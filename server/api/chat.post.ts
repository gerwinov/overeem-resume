import { waitUntil } from '@vercel/functions'

const MODEL = 'anthropic/claude-haiku-4.5'
// A body above this cannot be valid under the limits in parseChatRequest, so reading stops there.
const MAX_BODY_BYTES = 200_000

async function readContent(name: string): Promise<string> {
  const value = await useStorage('assets:server').getItem(`content:${name}`)
  if (typeof value === 'string') return value
  if (value instanceof Uint8Array) return new TextDecoder().decode(value)
  throw new Error(`Content file missing: server/assets/content/${name}`)
}

const deps: ChatDeps = {
  model: MODEL,
  loadContent: async () => {
    const [cv, about] = await Promise.all([readContent('cv.md'), readContent('about.md')])
    return { cv, about }
  },
  sendMeetingEmail: sendWithResend,
  tracing: langsmithTracing,
  waitUntil,
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
    // Malformed JSON is rejected by handleChat like any other invalid body.
  }

  return handleChat(body, deps)
})
