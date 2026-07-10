import { describe, it, expect } from 'vitest'
import { cancelScheduleErrorMessage } from '~/utils/scheduleError'

describe('cancelScheduleErrorMessage', () => {
  it('409 は「既に送信済み」の文言に変換する', () => {
    expect(cancelScheduleErrorMessage(new Error('API エラー (409): ')))
      .toBe('この通知は既に送信済み (またはキャンセル済み) です')
  })

  it('404 は「見つかりませんでした」の文言に変換する', () => {
    expect(cancelScheduleErrorMessage(new Error('API エラー (404): not found')))
      .toBe('この通知予約は見つかりませんでした (削除済みの可能性があります)')
  })

  it('その他のエラーは汎用文言に変換する (生の status を出さない)', () => {
    const msg = cancelScheduleErrorMessage(new Error('API エラー (500): boom'))
    expect(msg).toBe('通知予約のキャンセルに失敗しました。時間をおいて再度お試しください')
    expect(msg).not.toContain('500')
  })

  it('Error 以外が投げられても汎用文言を返す', () => {
    expect(cancelScheduleErrorMessage('oops'))
      .toBe('通知予約のキャンセルに失敗しました。時間をおいて再度お試しください')
  })
})
