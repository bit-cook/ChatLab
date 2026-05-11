/**
 * 会话查询模块（平台无关）
 *
 * 纯 SQL 查询函数，接收 DatabaseAdapter 参数，不依赖全局状态。
 * 这些函数是 CLI/MCP/HTTP API 查询会话数据的基础。
 */

import type { DatabaseAdapter } from '../interfaces'

export interface SessionMeta {
  name: string
  platform: string
  type: string
  importedAt: number
  groupId: string | null
  groupAvatar: string | null
  ownerId: string | null
}

export interface SessionOverview {
  totalMessages: number
  totalMembers: number
  firstMessageTs: number | null
  lastMessageTs: number | null
}

export interface SessionInfo extends SessionMeta {
  id: string
  overview: SessionOverview
}

/**
 * 判断数据库是否为聊天会话数据库
 * 通过核心三表（meta/member/message）存在性快速识别
 */
export function isChatSessionDb(db: DatabaseAdapter): boolean {
  const row = db
    .prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name IN ('meta', 'member', 'message')")
    .get() as { cnt: number } | undefined
  return row?.cnt === 3
}

/**
 * 读取会话元信息
 */
export function getSessionMeta(db: DatabaseAdapter): SessionMeta | null {
  const row = db.prepare('SELECT * FROM meta LIMIT 1').get() as Record<string, unknown> | undefined
  if (!row) return null

  return {
    name: row.name as string,
    platform: row.platform as string,
    type: row.type as string,
    importedAt: row.imported_at as number,
    groupId: (row.group_id as string) || null,
    groupAvatar: (row.group_avatar as string) || null,
    ownerId: (row.owner_id as string) || null,
  }
}

/**
 * 查询会话基础统计（消息数、成员数、时间范围）
 */
export function getSessionOverview(db: DatabaseAdapter): SessionOverview {
  const msgRow = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM message msg
       JOIN member m ON msg.sender_id = m.id
       WHERE COALESCE(m.account_name, '') != '系统消息'`
    )
    .get() as { count: number }

  const memberRow = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM member
       WHERE COALESCE(account_name, '') != '系统消息'`
    )
    .get() as { count: number }

  const firstTs = (db.prepare('SELECT MIN(ts) as v FROM message').get() as { v: number | null })?.v ?? null
  const lastTs = (db.prepare('SELECT MAX(ts) as v FROM message').get() as { v: number | null })?.v ?? null

  return {
    totalMessages: msgRow.count,
    totalMembers: memberRow.count,
    firstMessageTs: firstTs,
    lastMessageTs: lastTs,
  }
}

/**
 * 获取数据库中的表结构（Schema）
 */
export function getDatabaseSchema(db: DatabaseAdapter): Array<{ name: string; sql: string }> {
  return db
    .prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as Array<{ name: string; sql: string }>
}
