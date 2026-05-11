/**
 * 基础统计查询模块（平台无关）
 *
 * 提供活跃度排行、时段分布等核心统计查询。
 * 所有函数接收 DatabaseAdapter 参数，不依赖全局状态。
 */

import type { TimeFilter } from '@openchatlab/shared-types'
import type { DatabaseAdapter } from '../interfaces'
import { buildTimeFilter, buildSystemMessageFilter } from './filters'

export interface MemberActivity {
  memberId: number
  platformId: string
  name: string
  avatar: string | null
  messageCount: number
  percentage: number
}

export interface HourlyActivity {
  hour: number
  messageCount: number
}

export interface DailyActivity {
  date: string
  messageCount: number
}

export interface WeekdayActivity {
  weekday: number
  messageCount: number
}

export interface MessageTypeStats {
  type: number
  count: number
}

/**
 * 获取可用的年份列表
 */
export function getAvailableYears(db: DatabaseAdapter): number[] {
  const rows = db
    .prepare(
      `SELECT DISTINCT CAST(strftime('%Y', ts, 'unixepoch', 'localtime') AS INTEGER) as year
       FROM message
       ORDER BY year DESC`
    )
    .all() as Array<{ year: number }>

  return rows.map((r) => r.year)
}

/**
 * 获取成员活跃度排行
 */
export function getMemberActivity(db: DatabaseAdapter, filter?: TimeFilter): MemberActivity[] {
  const { clause, params } = buildTimeFilter(filter)

  const msgFilterBase = clause ? clause.replace('WHERE', 'AND') : ''
  const msgFilterWithSystem = msgFilterBase + " AND COALESCE(m.account_name, '') != '系统消息'"

  const totalClauseWithSystem = buildSystemMessageFilter(clause)
  const totalMessages = (
    db
      .prepare(
        `SELECT COUNT(*) as count
         FROM message msg
         JOIN member m ON msg.sender_id = m.id
         ${totalClauseWithSystem}`
      )
      .get(...params) as { count: number }
  ).count

  const rows = db
    .prepare(
      `SELECT
        m.id as memberId,
        m.platform_id as platformId,
        COALESCE(m.group_nickname, m.account_name, m.platform_id) as name,
        m.avatar as avatar,
        COUNT(msg.id) as messageCount
      FROM member m
      LEFT JOIN message msg ON m.id = msg.sender_id ${msgFilterWithSystem}
      WHERE COALESCE(m.account_name, '') != '系统消息'
      GROUP BY m.id
      HAVING messageCount > 0
      ORDER BY messageCount DESC`
    )
    .all(...params) as Array<{
    memberId: number
    platformId: string
    name: string
    avatar: string | null
    messageCount: number
  }>

  return rows.map((row) => ({
    ...row,
    percentage: totalMessages > 0 ? Math.round((row.messageCount / totalMessages) * 10000) / 100 : 0,
  }))
}

/**
 * 获取每小时活跃度分布
 */
export function getHourlyActivity(db: DatabaseAdapter, filter?: TimeFilter): HourlyActivity[] {
  const { clause, params } = buildTimeFilter(filter)
  const clauseWithSystem = buildSystemMessageFilter(clause)

  const rows = db
    .prepare(
      `SELECT
        CAST(strftime('%H', msg.ts, 'unixepoch', 'localtime') AS INTEGER) as hour,
        COUNT(*) as messageCount
      FROM message msg
      JOIN member m ON msg.sender_id = m.id
      ${clauseWithSystem}
      GROUP BY hour
      ORDER BY hour`
    )
    .all(...params) as Array<{ hour: number; messageCount: number }>

  const result: HourlyActivity[] = []
  for (let h = 0; h < 24; h++) {
    const found = rows.find((r) => r.hour === h)
    result.push({ hour: h, messageCount: found ? found.messageCount : 0 })
  }
  return result
}

/**
 * 获取每日活跃度趋势
 */
export function getDailyActivity(db: DatabaseAdapter, filter?: TimeFilter): DailyActivity[] {
  const { clause, params } = buildTimeFilter(filter)
  const clauseWithSystem = buildSystemMessageFilter(clause)

  return db
    .prepare(
      `SELECT
        strftime('%Y-%m-%d', msg.ts, 'unixepoch', 'localtime') as date,
        COUNT(*) as messageCount
      FROM message msg
      JOIN member m ON msg.sender_id = m.id
      ${clauseWithSystem}
      GROUP BY date
      ORDER BY date`
    )
    .all(...params) as unknown as DailyActivity[]
}

/**
 * 获取星期活跃度分布
 */
export function getWeekdayActivity(db: DatabaseAdapter, filter?: TimeFilter): WeekdayActivity[] {
  const { clause, params } = buildTimeFilter(filter)
  const clauseWithSystem = buildSystemMessageFilter(clause)

  const rows = db
    .prepare(
      `SELECT
        CASE
          WHEN CAST(strftime('%w', msg.ts, 'unixepoch', 'localtime') AS INTEGER) = 0 THEN 7
          ELSE CAST(strftime('%w', msg.ts, 'unixepoch', 'localtime') AS INTEGER)
        END as weekday,
        COUNT(*) as messageCount
      FROM message msg
      JOIN member m ON msg.sender_id = m.id
      ${clauseWithSystem}
      GROUP BY weekday
      ORDER BY weekday`
    )
    .all(...params) as Array<{ weekday: number; messageCount: number }>

  const result: WeekdayActivity[] = []
  for (let w = 1; w <= 7; w++) {
    const found = rows.find((r) => r.weekday === w)
    result.push({ weekday: w, messageCount: found ? found.messageCount : 0 })
  }
  return result
}

/**
 * 获取消息类型分布
 */
export function getMessageTypeStats(db: DatabaseAdapter, filter?: TimeFilter): MessageTypeStats[] {
  const { clause, params } = buildTimeFilter(filter)
  const clauseWithSystem = buildSystemMessageFilter(clause)

  return db
    .prepare(
      `SELECT
        msg.type as type,
        COUNT(*) as count
      FROM message msg
      JOIN member m ON msg.sender_id = m.id
      ${clauseWithSystem}
      GROUP BY msg.type
      ORDER BY count DESC`
    )
    .all(...params) as unknown as MessageTypeStats[]
}
