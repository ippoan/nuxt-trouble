/**
 * 通知のテスト送信 (POST /api/trouble/notification-prefs/test-send) の失敗を
 * 短い表示文言に変換する。
 *
 * request() は失敗時に `API エラー (<status>): <body>` を投げ、body は
 * `{"error": "<語>"}`。既知の語は日本語に、それ以外は語をそのまま出す。
 */
const TEST_SEND_ERROR_LABELS: Record<string, string> = {
  bot_config_not_found: 'LINE WORKS の Bot が未設定です',
}

export function testSendErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : ''
  const m = msg.match(/^API エラー \((\d+)\): ([\s\S]*)$/)
  if (!m) return msg || '送信に失敗しました'
  const status = m[1]
  let code = ''
  try {
    const body = JSON.parse(m[2]!) as { error?: unknown } | null
    if (typeof body?.error === 'string') code = body.error
  } catch {
    // body が JSON でない場合は status だけ出す
  }
  if (!code) return `送信に失敗しました (${status})`
  return `${TEST_SEND_ERROR_LABELS[code] ?? code} (${status})`
}
