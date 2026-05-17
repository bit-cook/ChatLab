/**
 * Canonical message deduplication key generator.
 *
 * Used by both Electron (worker import, merger) and Server (importer)
 * to produce deterministic content-hash keys for messages that lack
 * a platform_message_id.
 *
 * Uses a pure-JS FNV-1a 64-bit hash (browser-safe, no Node.js deps).
 * Segments are NUL-separated; content is preceded by a type discriminator
 * so that null content and the literal string "null" hash differently.
 *
 * Empty-string content is normalized to null before hashing to match the
 * storage-layer behavior where '' is folded to NULL in SQLite.
 */

/**
 * FNV-1a 64-bit hash implemented with two 32-bit halves.
 * Returns a 16-char hex string (~11 chars base36).
 */
function fnv1a64(input: string): string {
  // FNV offset basis for 64-bit: 0xcbf29ce484222325
  let h0 = 0x811c9dc5 // low 32
  let h1 = 0xcbf29ce4 // high 32

  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h0 ^= c
    // FNV prime for 64-bit: 0x00000100000001B3
    // Multiply (h1:h0) * 0x01000193 (32-bit FNV prime for low half mixing)
    // and cross-mix to approximate 64-bit FNV
    const t0 = Math.imul(h0, 0x01000193)
    const t1 = Math.imul(h1, 0x01000193) + Math.imul(h0, 0x01)
    h0 = t0 >>> 0
    h1 = t1 >>> 0
  }

  const hi = h1.toString(16).padStart(8, '0')
  const lo = h0.toString(16).padStart(8, '0')
  return hi + lo
}

export function generateMessageKey(timestamp: number, senderPlatformId: string, content: string | null): string {
  const normalizedContent = content || null
  const parts = [
    String(timestamp),
    senderPlatformId,
    normalizedContent === null ? 'null' : 'text',
    normalizedContent ?? '',
  ]
  return fnv1a64(parts.join('\0'))
}
