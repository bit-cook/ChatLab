import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { tokenizeForFts, tokenizeQueryForFts } from '../fts-tokenizer'

describe('tokenizeForFts', () => {
  it('returns empty string for null/undefined/empty', () => {
    assert.equal(tokenizeForFts(null), '')
    assert.equal(tokenizeForFts(undefined), '')
    assert.equal(tokenizeForFts(''), '')
    assert.equal(tokenizeForFts('   '), '')
  })

  it('tokenizes text and lowercases tokens', () => {
    const result = tokenizeForFts('Hello World')
    assert.ok(result.length > 0)
    assert.equal(result, result.toLowerCase())
  })

  it('produces non-empty output for Chinese text', () => {
    const result = tokenizeForFts('今天天气很好')
    assert.ok(result.length > 0)
  })

  it('handles mixed CJK and Latin text', () => {
    const result = tokenizeForFts('Hello 你好 World')
    assert.ok(result.includes('hello'))
  })
})

describe('tokenizeQueryForFts', () => {
  it('returns empty string for empty array', () => {
    assert.equal(tokenizeQueryForFts([]), '')
  })

  it('returns empty string for array of whitespace', () => {
    assert.equal(tokenizeQueryForFts(['  ', '']), '')
  })

  it('wraps single simple keyword in quotes', () => {
    const result = tokenizeQueryForFts(['hello'])
    assert.ok(result.includes('"hello"'))
  })

  it('joins multiple keywords with OR', () => {
    const result = tokenizeQueryForFts(['hello', 'world'])
    assert.ok(result.includes('OR'))
  })

  it('handles Chinese keywords', () => {
    const result = tokenizeQueryForFts(['今天开心'])
    assert.ok(result.length > 0)
  })
})
