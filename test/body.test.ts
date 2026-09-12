import { describe, expect, it } from 'vitest'
import { readLimited } from '../server/utils/body'

async function* chunks(...parts: (string | Uint8Array)[]) {
  yield* parts
}

describe('readLimited', () => {
  it('returns the whole body when it fits', async () => {
    expect(await readLimited(chunks('{"a":', new TextEncoder().encode('1}')), 100)).toBe('{"a":1}')
  })

  it('returns null as soon as the body passes the limit, without reading the rest', async () => {
    let read = 0
    async function* endless() {
      while (true) {
        read++
        yield 'x'.repeat(10)
      }
    }
    expect(await readLimited(endless(), 25)).toBeNull()
    expect(read).toBe(3)
  })

  it('cancels the source when the limit is passed, so the rest is never read', async () => {
    let cancelled = false
    async function* source() {
      try {
        while (true) yield 'x'.repeat(10)
      }
      finally {
        cancelled = true
      }
    }
    expect(await readLimited(source(), 25)).toBeNull()
    expect(cancelled).toBe(true)
  })

  it('keeps earlier chunks intact when the stream reuses its buffer', async () => {
    // A Node Buffer, as request bodies deliver it: its slice() is a view, not a copy.
    const NodeBuffer = (globalThis as unknown as { Buffer: { alloc(size: number): Uint8Array } }).Buffer
    const shared = NodeBuffer.alloc(3)
    async function* reusing() {
      shared.set(new TextEncoder().encode('abc'))
      yield shared
      shared.set(new TextEncoder().encode('def'))
      yield shared
    }
    expect(await readLimited(reusing(), 100)).toBe('abcdef')
  })

  it('counts bytes, not characters', async () => {
    expect(await readLimited(chunks('é'.repeat(6)), 11)).toBeNull()
    expect(await readLimited(chunks('é'.repeat(5)), 11)).toBe('ééééé')
  })
})
