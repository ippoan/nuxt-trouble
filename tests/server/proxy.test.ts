import { describe, it, expect, vi, beforeEach } from 'vitest'

// 転送 + introspect 検証 + identity 注入の本体は @ippoan/auth-client/server の
// createIdentityProxyHandler に集約 (#434 step 2)。挙動テスト (introspect /
// X-Tenant-ID + X-User-* 注入 / binary・JSON 分類) は lib 側 (auth-worker)。
// ここでは本 repo の server route の wiring だけ固定する:
//   1. INTERNAL_SHARED_SECRET binding を resolve して渡す (未設定は throw)
//   2. AUTH_WORKER service binding / authWorkerUrl / backendUrl を解決して委譲
//   3. createIdentityProxyHandler の戻り値で proxy(event) を返す
//
// 本 repo は @nuxt/test-utils 環境で、route の bare auto-import
// (defineEventHandler / createError / useRuntimeConfig) は **実 nuxt/h3 が解決
// される** (globalThis stub も #imports mock も実体に負ける)。よって:
//   - createError は実 h3 でそのまま throw させ rejects.toThrow で検証
//     (statusCode の内部検証は実体に委ねる)
//   - useRuntimeConfig を呼ぶ backendUrl closure は invoke しない
//     (`[nuxt] instance unavailable` を避ける。関数として渡ることだけ確認)
// lib (createIdentityProxyHandler) のみ mock して wiring を見る。

const { proxyFn, createIdentityProxyHandlerMock } = vi.hoisted(() => {
  const proxyFn = vi.fn(() => 'PROXY_RESULT')
  // route 直 import 時に top-level の defineEventHandler(...) を解決させるため
  // globalThis に注入 (module import より前に走る hoisted)。createError /
  // useRuntimeConfig は request 時呼び出しで実 nuxt/h3 が解決されるため stub しない。
  ;(globalThis as Record<string, unknown>).defineEventHandler = (fn: unknown) => fn
  return {
    proxyFn,
    createIdentityProxyHandlerMock: vi.fn((_opts: unknown) => proxyFn),
  }
})

vi.mock('@ippoan/auth-client/server', () => ({
  createIdentityProxyHandler: createIdentityProxyHandlerMock,
}))

import handler from '../../server/api/proxy/[...path]'

interface ProxyWiring {
  backendUrl: (event: unknown) => string
  authWorkerUrl: string
  sharedSecret: string
}

const call = (event: unknown) => (handler as unknown as (e: unknown) => Promise<unknown>)(event)
const eventWith = (env: Record<string, unknown>) => ({ context: { cloudflare: { env } } })

describe('proxy handler wiring (createIdentityProxyHandler, #434)', () => {
  beforeEach(() => {
    createIdentityProxyHandlerMock.mockClear()
    proxyFn.mockClear()
  })

  it('INTERNAL_SHARED_SECRET があれば委譲し proxy(event) を返す', async () => {
    const event = eventWith({
      INTERNAL_SHARED_SECRET: 'secret-x',
      NUXT_PUBLIC_AUTH_WORKER_URL: 'https://auth-test.example.com',
      AUTH_WORKER: { fetch: vi.fn() },
    })
    const res = await call(event)
    expect(createIdentityProxyHandlerMock).toHaveBeenCalledTimes(1)
    const opts = createIdentityProxyHandlerMock.mock.calls[0]![0] as ProxyWiring
    expect(opts.sharedSecret).toBe('secret-x')
    expect(opts.authWorkerUrl).toBe('https://auth-test.example.com')
    // backendUrl は関数として渡る (中身は useRuntimeConfig 解決 = 実 nuxt 依存
    // なので invoke しない)。
    expect(typeof opts.backendUrl).toBe('function')
    expect(proxyFn).toHaveBeenCalledWith(event)
    expect(res).toBe('PROXY_RESULT')
  })

  it('INTERNAL_SHARED_SECRET が Secrets Store binding (.get()) でも解決する', async () => {
    const event = eventWith({
      INTERNAL_SHARED_SECRET: { get: async () => 'from-store' },
      AUTH_WORKER: { fetch: vi.fn() },
    })
    await call(event)
    const opts = createIdentityProxyHandlerMock.mock.calls[0]![0] as ProxyWiring
    expect(opts.sharedSecret).toBe('from-store')
  })

  it('INTERNAL_SHARED_SECRET 未設定なら委譲せず throw する', async () => {
    // 実 h3 createError が 503 を throw する。委譲には到達しない。
    await expect(call(eventWith({}))).rejects.toThrow()
    expect(createIdentityProxyHandlerMock).not.toHaveBeenCalled()
  })

  it('NUXT_PUBLIC_AUTH_WORKER_URL 未設定なら本番 auth-worker にフォールバック', async () => {
    await call(eventWith({ INTERNAL_SHARED_SECRET: 'x' }))
    const opts = createIdentityProxyHandlerMock.mock.calls[0]![0] as ProxyWiring
    expect(opts.authWorkerUrl).toBe('https://auth.ippoan.org')
  })
})
