import type { TroubleSchedule, LineworksMember } from '~/types'

/** チケット詳細のスケジュール通知一覧の既定表示件数 (Refs #198) */
export const SCHEDULE_DISPLAY_LIMIT = 5

/** scheduled_at 降順 (新しい予約が上)。元配列は変更しない。 */
export function sortSchedulesDesc(schedules: TroubleSchedule[]): TroubleSchedule[] {
  return [...schedules].sort(
    (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
  )
}

/** 折りたたみ時は先頭 limit 件だけ返す。showAll なら全件。 */
export function visibleSchedules(
  sorted: TroubleSchedule[],
  showAll: boolean,
  limit: number = SCHEDULE_DISPLAY_LIMIT,
): TroubleSchedule[] {
  return showAll ? sorted : sorted.slice(0, limit)
}

/** 検索比較用の正規化: 小文字化 + 空白除去 (「本多 優鷹」を「本多優鷹」でも当てる) */
function normalizeForSearch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '')
}

/** 送信先メンバーを名前 / メールで部分一致フィルタする (Refs #198)。空クエリは全件。 */
export function filterLineworksMembers(
  members: LineworksMember[],
  query: string,
): LineworksMember[] {
  const q = normalizeForSearch(query)
  if (!q) return members
  return members.filter(m =>
    normalizeForSearch(m.user_name || '').includes(q)
    || normalizeForSearch(m.email || '').includes(q),
  )
}
