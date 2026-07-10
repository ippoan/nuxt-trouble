/**
 * 通知予約キャンセル失敗時のエラーメッセージを user 向け文言に変換する。
 *
 * backend は status != pending の予約への cancel を 409 CONFLICT (body 無し) で
 * reject するため、生の「API エラー (409):」をそのまま出さない (Refs #190)。
 */
export function cancelScheduleErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : ''
  if (msg.includes('(409)')) {
    return 'この通知は既に送信済み (またはキャンセル済み) です'
  }
  if (msg.includes('(404)')) {
    return 'この通知予約は見つかりませんでした (削除済みの可能性があります)'
  }
  return '通知予約のキャンセルに失敗しました。時間をおいて再度お試しください'
}
