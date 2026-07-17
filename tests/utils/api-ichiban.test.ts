import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  setupApi,
  teardownApi,
  mockFetch,
  assertMock,
  verifyApi,
  callApi,
  expectMock,
  isLive,
  API_BASE,
  restoreNativeApis,
} from '../helpers/api-test-env'
import { initApi, updateEmployee, getIchibanEmployees } from '~/utils/api'

// 一番星 社員ﾏｽﾀ同期まわりの API client (Refs #220)

describe('Employees update / Ichiban employees API', () => {
  beforeEach(async () => {
    restoreNativeApis()
    await setupApi()
  })
  afterEach(() => teardownApi())

  describe('updateEmployee', () => {
    it('PUT /api/employees/{id} を叩く', async () => {
      await callApi(() =>
        verifyApi(
          () => updateEmployee('e1', { name: '田中', code: '1001' }),
          { id: 'e1', tenant_id: 't', name: '田中', code: '1001' },
        ),
      )
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/employees/e1`,
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ name: '田中', code: '1001' }),
          }),
        )
      })
    })
  })

  // /api/ichiban/employees は同一 Worker の server route (相対 URL) なので
  // live mode (実 rust-alc-api 直叩き) では検証できない → mock mode のみ。
  describe.skipIf(isLive)('getIchibanEmployees', () => {
    it('server route から data 配列を取り出して返す', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            source_table: '社員ﾏｽﾀ',
            data: [{ employee_code: '1001', employee_name: '田中太郎', employee_r: '田中' }],
          }),
      })
      const rows = await getIchibanEmployees()
      expect(rows).toEqual([
        { employee_code: '1001', employee_name: '田中太郎', employee_r: '田中' },
      ])
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ichiban/employees',
        expect.objectContaining({ headers: expect.any(Object) }),
      )
    })

    it('401 なら onUnauthorized を呼んで Unauthorized を throw する', async () => {
      const onUnauthorized = vi.fn()
      initApi(API_BASE, () => 'tok', undefined, undefined, onUnauthorized)
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' })
      await expect(getIchibanEmployees()).rejects.toThrow('Unauthorized')
      expect(onUnauthorized).toHaveBeenCalled()
    })

    it('エラー時は body 付きの API エラーを throw する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: () => Promise.resolve('一番星からの社員一覧取得に失敗しました'),
      })
      await expect(getIchibanEmployees()).rejects.toThrow('API エラー (502)')
    })

    it('body が読めない時は statusText へフォールバックする', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: () => Promise.reject(new Error('no body')),
      })
      await expect(getIchibanEmployees()).rejects.toThrow('Service Unavailable')
    })
  })
})
