/**
 * FTS5 tokenizer — shared implementation.
 *
 * Unlike NLP word-frequency analysis, FTS tokenization keeps all tokens
 * (no POS filtering, no stopwords) to maximize recall in search scenarios.
 *
 * Uses jieba for Chinese (naturally handles mixed CJK/Latin text),
 * falls back to whitespace split when jieba is unavailable.
 */

import { getJieba } from './segmenter'

export function tokenizeForFts(text: string | null | undefined): string {
  if (!text || text.trim().length === 0) return ''

  try {
    const jieba = getJieba()
    const tokens = jieba.cut(text, false)
    return tokens
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
      .join(' ')
  } catch {
    return fallbackTokenize(text)
  }
}

function fallbackTokenize(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .join(' ')
}

function escapeToken(token: string): string {
  return `"${token.replace(/"/g, '""')}"`
}

/**
 * Convert a list of user search keywords into an FTS5 MATCH expression.
 *
 * - Single keyword: tokens joined with AND (all must appear)
 * - Multiple keywords: groups joined with OR (any match)
 */
export function tokenizeQueryForFts(keywords: string[]): string {
  if (keywords.length === 0) return ''

  const groups = keywords
    .map((kw) => {
      const trimmed = kw.trim()
      if (!trimmed) return ''

      try {
        const jieba = getJieba()
        const tokens = jieba
          .cut(trimmed, false)
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)

        if (tokens.length === 0) return ''
        if (tokens.length === 1) return escapeToken(tokens[0])
        return tokens.map(escapeToken).join(' ')
      } catch {
        const simple = trimmed.toLowerCase().trim()
        return simple ? escapeToken(simple) : ''
      }
    })
    .filter((g) => g.length > 0)

  if (groups.length === 0) return ''
  if (groups.length === 1) return groups[0]

  return groups.map((g) => (g.includes(' ') ? `(${g})` : g)).join(' OR ')
}
