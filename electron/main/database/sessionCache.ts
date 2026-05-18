/**
 * Session cache — Electron re-export layer.
 *
 * All logic has been extracted to @openchatlab/node-runtime/cache.
 * This file provides backward-compatible imports for existing Electron code.
 */

export {
  getCachePath,
  getCache,
  setCache,
  invalidateCache,
  deleteSessionCache,
  computeAndSetOverviewCache,
  computeAndSetMembersCache,
  CACHE_KEY_OVERVIEW,
  CACHE_KEY_MEMBERS,
} from '@openchatlab/node-runtime'

export type { OverviewCache, MembersCache, MemberStat } from '@openchatlab/node-runtime'
