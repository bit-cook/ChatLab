import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { generateMessageKey } from '../dedup'

describe('generateMessageKey', () => {
  const ts = 1710000000
  const sender = 'user-1'

  it('empty string and null produce the same key (storage normalization)', () => {
    const keyEmpty = generateMessageKey(ts, sender, '')
    const keyNull = generateMessageKey(ts, sender, null)
    assert.equal(keyEmpty, keyNull)
  })

  it('different content produces different keys even with the same length', () => {
    const a = generateMessageKey(ts, sender, '你好啊')
    const b = generateMessageKey(ts, sender, '再见呀')
    assert.notEqual(a, b)
  })

  it('different timestamps produce different keys', () => {
    const a = generateMessageKey(ts, sender, 'hello')
    const b = generateMessageKey(ts + 1, sender, 'hello')
    assert.notEqual(a, b)
  })

  it('different senders produce different keys', () => {
    const a = generateMessageKey(ts, 'alice', 'hello')
    const b = generateMessageKey(ts, 'bob', 'hello')
    assert.notEqual(a, b)
  })

  it('returns a base64url string (no +, /, =)', () => {
    const key = generateMessageKey(ts, sender, 'test content')
    assert.ok(key.length > 0)
    assert.ok(!/[+/=]/.test(key), `key should be base64url but got: ${key}`)
  })

  it('is deterministic for identical inputs', () => {
    const a = generateMessageKey(ts, sender, 'same content')
    const b = generateMessageKey(ts, sender, 'same content')
    assert.equal(a, b)
  })

  it('null content and the literal string "null" produce different keys', () => {
    const keyNull = generateMessageKey(ts, sender, null)
    const keyLiteral = generateMessageKey(ts, sender, 'null')
    assert.notEqual(keyNull, keyLiteral)
  })
})
