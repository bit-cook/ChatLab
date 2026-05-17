/**
 * Canonical message deduplication key generator.
 *
 * Used by both Electron (worker import, merger) and Server (importer)
 * to produce deterministic content-hash keys for messages that lack
 * a platform_message_id.
 *
 * The key is a SHA-256 digest encoded as base64url (full length, ~43 chars).
 * Segments are NUL-separated; content is preceded by a type discriminator
 * so that null content and the literal string "null" hash differently.
 *
 * Empty-string content is normalized to null before hashing to match the
 * storage-layer behavior where '' is folded to NULL in SQLite.
 */

import { createHash } from 'crypto'

export function generateMessageKey(timestamp: number, senderPlatformId: string, content: string | null): string {
  const normalizedContent = content || null
  const hash = createHash('sha256')
  hash.update(String(timestamp))
  hash.update('\0')
  hash.update(senderPlatformId)
  hash.update('\0')
  hash.update(normalizedContent === null ? 'null' : 'text')
  hash.update('\0')
  if (normalizedContent !== null) {
    hash.update(normalizedContent)
  }
  return hash.digest('base64url')
}
