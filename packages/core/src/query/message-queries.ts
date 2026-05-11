/**
 * 消息查询模块（平台无关）
 *
 * 提供消息搜索、分页等基础查询能力。
 * 复杂的 FTS 搜索留在 Electron/Server 层处理（依赖分词器）。
 */

import type { DatabaseAdapter } from '../interfaces'

export interface MessageResult {
  id: number
  senderId: number
  senderName: string
  senderPlatformId: string
  content: string
  timestamp: number
  type: number
}

export interface PaginatedMessages {
  messages: MessageResult[]
  hasMore: boolean
  total?: number
}

/**
 * 基于 LIKE 的简单关键词搜索
 * 不依赖 FTS 索引，适用于 CLI/MCP 场景
 */
export function searchMessagesLike(
  db: DatabaseAdapter,
  keyword: string,
  options?: { limit?: number; offset?: number }
): PaginatedMessages {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const countRow = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM message msg
       JOIN member m ON msg.sender_id = m.id
       WHERE msg.content LIKE ? AND COALESCE(m.account_name, '') != '系统消息'`
    )
    .get(`%${keyword}%`) as { total: number }

  const rows = db
    .prepare(
      `SELECT
        msg.id as id,
        m.id as senderId,
        COALESCE(m.group_nickname, m.account_name, m.platform_id) as senderName,
        m.platform_id as senderPlatformId,
        msg.content as content,
        msg.ts as timestamp,
        msg.type as type
      FROM message msg
      JOIN member m ON msg.sender_id = m.id
      WHERE msg.content LIKE ? AND COALESCE(m.account_name, '') != '系统消息'
      ORDER BY msg.ts DESC
      LIMIT ? OFFSET ?`
    )
    .all(`%${keyword}%`, limit + 1, offset) as Array<{
    id: number
    senderId: number
    senderName: string
    senderPlatformId: string
    content: string
    timestamp: number
    type: number
  }>

  const hasMore = rows.length > limit
  const messages = rows.slice(0, limit).map((row) => ({
    id: Number(row.id),
    senderId: Number(row.senderId),
    senderName: String(row.senderName || ''),
    senderPlatformId: String(row.senderPlatformId || ''),
    content: row.content != null ? String(row.content) : '',
    timestamp: Number(row.timestamp),
    type: Number(row.type),
  }))

  return { messages, hasMore, total: countRow.total }
}

/**
 * 获取最近 N 条消息
 */
export function getRecentMessages(
  db: DatabaseAdapter,
  options?: { limit?: number }
): MessageResult[] {
  const limit = options?.limit ?? 50

  const rows = db
    .prepare(
      `SELECT
        msg.id as id,
        m.id as senderId,
        COALESCE(m.group_nickname, m.account_name, m.platform_id) as senderName,
        m.platform_id as senderPlatformId,
        msg.content as content,
        msg.ts as timestamp,
        msg.type as type
      FROM message msg
      JOIN member m ON msg.sender_id = m.id
      WHERE COALESCE(m.account_name, '') != '系统消息'
      ORDER BY msg.ts DESC
      LIMIT ?`
    )
    .all(limit) as Array<{
    id: number
    senderId: number
    senderName: string
    senderPlatformId: string
    content: string
    timestamp: number
    type: number
  }>

  return rows.map((row) => ({
    id: Number(row.id),
    senderId: Number(row.senderId),
    senderName: String(row.senderName || ''),
    senderPlatformId: String(row.senderPlatformId || ''),
    content: row.content != null ? String(row.content) : '',
    timestamp: Number(row.timestamp),
    type: Number(row.type),
  }))
}

/**
 * 获取成员列表
 */
export function getMembers(
  db: DatabaseAdapter
): Array<{ id: number; platformId: string; name: string; messageCount: number }> {
  return db
    .prepare(
      `SELECT
        m.id as id,
        m.platform_id as platformId,
        COALESCE(m.group_nickname, m.account_name, m.platform_id) as name,
        (SELECT COUNT(*) FROM message WHERE sender_id = m.id) as messageCount
      FROM member m
      WHERE COALESCE(m.account_name, '') != '系统消息'
      ORDER BY messageCount DESC`
    )
    .all() as Array<{ id: number; platformId: string; name: string; messageCount: number }>
}

/**
 * 执行只读 SQL 查询（SQL Lab）
 */
export function executeReadonlySql(
  db: DatabaseAdapter,
  sql: string,
  maxRows: number = 1000
): { columns: string[]; rows: Record<string, unknown>[]; rowCount: number; truncated: boolean } {
  const trimmed = sql.trim()

  const forbidden = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|REINDEX|VACUUM|PRAGMA)/i
  if (forbidden.test(trimmed)) {
    throw new Error('Only SELECT queries are allowed')
  }

  const needsLimit = !/\bLIMIT\b/i.test(trimmed)
  const safeSql = needsLimit ? `${trimmed} LIMIT ${maxRows + 1}` : trimmed

  const rows = db.prepare(safeSql).all() as Record<string, unknown>[]
  const truncated = rows.length > maxRows
  const resultRows = truncated ? rows.slice(0, maxRows) : rows
  const columns = resultRows.length > 0 ? Object.keys(resultRows[0]) : []

  return { columns, rows: resultRows, rowCount: resultRows.length, truncated }
}
