/**
 * Reads a request body but stops as soon as it exceeds `maxBytes`, whatever the request claims in
 * Content-Length. Returns `null` when the body is too large. Leaving the loop early calls the
 * iterator's return(), which for a Node request stream destroys it, so the rest is never read.
 */
export async function readLimited(chunks: AsyncIterable<Uint8Array | string>, maxBytes: number): Promise<string | null> {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  let size = 0
  for await (const chunk of chunks) {
    const incoming = typeof chunk === 'string' ? encoder.encode(chunk) : chunk
    size += incoming.byteLength
    if (size > maxBytes) return null
    // A copy, since a stream may reuse the buffer it hands out for its next chunk. Not slice(): on a
    // Node Buffer that is a view on the same memory.
    parts.push(typeof chunk === 'string' ? incoming : new Uint8Array(incoming))
  }

  const body = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    body.set(part, offset)
    offset += part.byteLength
  }
  return new TextDecoder().decode(body)
}
