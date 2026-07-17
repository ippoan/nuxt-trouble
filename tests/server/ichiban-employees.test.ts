import { describe, it, expect, vi, beforeEach } from 'vitest'

// /api/ichiban/employees (Refs #220) の wiring テスト。
// - requireAuth (introspect 検証) は @ippoan/auth-client/server 側の責務なので mock し、
//   「secret / URL / binding の fail-closed」と「認証 → binding fetch → data 透過」の
//   wiring だけをここで固定する (proxy.test.ts と同じ方針)。
const { requireAuthMock } = vi.hoisted(() => {
  ;(globalThis as Record<string, unknown>).defineEventHandler = (fn: unknown) => fn
  return { requireAuthMock: vi.fn(async () => ({ active: true as const })) }
})

vi.mock('@ippoan/auth-client/server', () => ({
  requireAuth: requireAuthMock,
}))

import handler from '../../server/api/ichiban/employees.get'

const call = (event: unknown) => (handler as unknown as (e: unknown) => Promise<unknown>)(event)
const eventWith = (env: Record<string, unknown>) => ({ context: { cloudflare: { env } } })

const BASE_ENV = {
  INTERNAL_SHARED_SECRET: 'secret-x',
  NUXT_PUBLIC_AUTH_WORKER_URL: 'https://auth.example',
}

function okBinding(data: unknown = { source_table: '社員ﾏｽﾀ', data: [] }) {
  return {
    fetch: vi.fn(async () => ({ ok: true, status: 200, json: async () => data })),
  }
}

describe('ichiban employees handler wiring', () => {
  beforeEach(() => {
    requireAuthMock.mockClear()
    requireAuthMock.mockResolvedValue({ active: true as const })
  })

  it('認証 → service binding fetch → data をそのまま返す', async () => {
    const data = {
      source_table: '社員ﾏｽﾀ',
      data: [{ employee_code: '1001', employee_name: '田中太郎', employee_r: '田中' }],
    }
    const binding = okBinding(data)
    const event = eventWith({ ...BASE_ENV, ICHIBAN_WORKER: binding })

    const res = await call(event)

    expect(requireAuthMock).toHaveBeenCalledTimes(1)
    expect(requireAuthMock.mock.calls[0]![1]).toEqual({
      authWorkerUrl: 'https://auth.example',
      sharedSecret: 'secret-x',
    })
    expect(binding.fetch).toHaveBeenCalledWith('https://nuxt-ichibanboshi/api/employees')
    expect(res).toEqual(data)
  })

  it('INTERNAL_SHARED_SECRET が Secrets Store binding (.get()) でも解決する', async () => {
    const binding = okBinding()
    const event = eventWith({
      ...BASE_ENV,
      INTERNAL_SHARED_SECRET: { get: async () => 'from-store' },
      ICHIBAN_WORKER: binding,
    })
    await call(event)
    expect(requireAuthMock.mock.calls[0]![1]).toMatchObject({ sharedSecret: 'from-store' })
  })

  it('INTERNAL_SHARED_SECRET 未設定なら認証前に throw (fail-closed)', async () => {
    const event = eventWith({
      NUXT_PUBLIC_AUTH_WORKER_URL: 'https://auth.example',
      ICHIBAN_WORKER: okBinding(),
    })
    await expect(call(event)).rejects.toThrow()
    expect(requireAuthMock).not.toHaveBeenCalled()
  })

  it('NUXT_PUBLIC_AUTH_WORKER_URL 未設定なら認証前に throw (fail-closed)', async () => {
    const event = eventWith({
      INTERNAL_SHARED_SECRET: 'secret-x',
      ICHIBAN_WORKER: okBinding(),
    })
    await expect(call(event)).rejects.toThrow()
    expect(requireAuthMock).not.toHaveBeenCalled()
  })

  it('requireAuth が 401 を throw したら binding fetch に到達しない', async () => {
    requireAuthMock.mockRejectedValueOnce(new Error('Unauthorized'))
    const binding = okBinding()
    const event = eventWith({ ...BASE_ENV, ICHIBAN_WORKER: binding })
    await expect(call(event)).rejects.toThrow('Unauthorized')
    expect(binding.fetch).not.toHaveBeenCalled()
  })

  it('ICHIBAN_WORKER binding 未設定なら throw (fail-closed 503)', async () => {
    const event = eventWith({ ...BASE_ENV })
    await expect(call(event)).rejects.toThrow()
    expect(requireAuthMock).toHaveBeenCalledTimes(1)
  })

  it('upstream が non-ok なら 502 相当で throw (詳細は echo しない)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const binding = {
      fetch: vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
    }
    const event = eventWith({ ...BASE_ENV, ICHIBAN_WORKER: binding })
    await expect(call(event)).rejects.toThrow('一番星からの社員一覧取得に失敗しました')
    consoleError.mockRestore()
  })
})
