import { readFileSync } from 'fs'
import { resolve } from 'path'

let cached: string | undefined

/**
 * Read version from apps/cli/package.json at runtime.
 * Works for both tsx dev (src/) and bundled (dist/).
 */
export function getVersion(): string {
  if (cached) return cached
  try {
    const pkgPath = resolve(__dirname, '../package.json')
    cached = JSON.parse(readFileSync(pkgPath, 'utf-8')).version
  } catch {
    cached = '0.0.0-dev'
  }
  return cached!
}
