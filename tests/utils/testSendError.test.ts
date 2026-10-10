import { describe, it, expect } from 'vitest'
import { testSendErrorMessage } from '~/utils/testSendError'

describe('testSendErrorMessage', () => {
  it('bot_config_not_found は日本語の文言 + status にする', () => {
    expect(testSendErrorMessage(new Error('API エラー (404): {"error":"bot_config_not_found"}')))
      .toBe('LINE WORKS の Bot が未設定です (404)')
  })

  it('未知の語はそのまま出す', () => {
    expect(testSendErrorMessage(new Error('API エラー (502): {"error":"send_failed"}')))
      .toBe('send_failed (502)')
  })

  it('body が JSON でなければ status だけ出す', () => {
    expect(testSendErrorMessage(new Error('API エラー (500): Internal Server Error')))
      .toBe('送信に失敗しました (500)')
  })

  it('error が文字列でなければ status だけ出す', () => {
    expect(testSendErrorMessage(new Error('API エラー (400): {"error":1}')))
      .toBe('送信に失敗しました (400)')
    expect(testSendErrorMessage(new Error('API エラー (400): null')))
      .toBe('送信に失敗しました (400)')
  })

  it('API エラー以外の Error はその message を出す', () => {
    expect(testSendErrorMessage(new Error('Unauthorized'))).toBe('Unauthorized')
  })

  it('Error 以外が投げられたら汎用文言', () => {
    expect(testSendErrorMessage('oops')).toBe('送信に失敗しました')
  })
})
