// 車検証関連の表示ヘルパー。
// rust-alc-api が返す ValidPeriodExpirdate (例: "2026-05-01" または "2026-05-01T00:00:00Z")
// を画面表示用に整形・分類する。

export type ExpiryStatus = 'expired' | 'soon' | 'ok' | 'unknown'

const SOON_DAYS = 30

/**
 * Format a car-inspection expiry value for display.
 * Returns "-" when value is empty. Truncates ISO datetime to YYYY-MM-DD.
 */
export function formatExpiry(v: string | null | undefined): string {
  if (!v) return '-'
  return v.length > 10 ? v.substring(0, 10) : v
}

/**
 * Classify a car-inspection expiry value.
 * - 'expired' : already past today
 * - 'soon'    : within SOON_DAYS days from today (inclusive of today)
 * - 'ok'      : valid for more than SOON_DAYS days
 * - 'unknown' : empty / unparseable
 *
 * `now` is injectable for tests.
 */
export function getExpiryStatus(
  v: string | null | undefined,
  now: Date = new Date(),
): ExpiryStatus {
  if (!v) return 'unknown'
  const ymd = v.length > 10 ? v.substring(0, 10) : v
  const expiry = new Date(`${ymd}T00:00:00`)
  if (Number.isNaN(expiry.getTime())) return 'unknown'
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffMs = expiry.getTime() - today.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'expired'
  if (diffDays <= SOON_DAYS) return 'soon'
  return 'ok'
}
