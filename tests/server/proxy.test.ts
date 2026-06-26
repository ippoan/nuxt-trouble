import { describe, it, expect, vi, beforeEach } from 'vitest'

// 転送 + introspect 検証 + identity 注入の本体は auth-worker `/alc-proxy/*` に
// 集約され (#434 step 3 方式 B)、consumer は @ippoan/auth-client/server の
// createAuthWorkerProxyHandler で service binding (AUTH_WORKER) に thin-forward
// するだけ。挙動テスト (JWT 検証 / ACL / OIDC mint / X-Tenant-ID + X-User-* 注入)
// は auth-worker 側。ここでは本 repo の server route の wiring だけ固定する:
//   1. INTERNAL_SHARED_SECRET binding を resolve して渡す (未設定は throw)
//   2. AUTH_WORKER service binding を解決して authWorkerFetch に渡す (未設定は throw)
//   3. pathPrefix='/' を渡す (client path が既に /api/ を含むため二重 /api 防止)
//   4. createAuthWorkerProxyHandler の戻り値で proxy(event) を返す
//
// 本 repo は @nuxt/test-utils 環境で、route の bare auto-import
// (defineEventHandler / createError) は **実 nuxt/h3 が解決される**
// (globalThis stub も #imports mock も実体に負ける)。よって:
//   - createError は実 h3 でそのまま throw させ rejects.toThrow で検証
// lib (createAuthWorkerProxyHandler) のみ mock して wiring を見る。

const { proxyFn, createAuthWorkerProxyHandlerMock } = vi.hoisted(() => {
  const proxyFn = vi.fn(() => 'PROXY_RESULT')
  // route 直 import 時に top-level の defineEventHandler(...) を解決させるため
  // globalThis に注入 (module import より前に走る hoisted)。createError は
  // request 時呼び出しで実 nuxt/h3 が解決されるため stub しない。
  ;(globalThis as Record<string, unknown>).defineEventHandler = (fn: unknown) => fn
  return {
    proxyFn,
    createAuthWorkerProxyHandlerMock: vi.fn((_opts: unknown) => proxyFn),
  }
})

vi.mock('@ippoan/auth-client/server', () => ({
  createAuthWorkerProxyHandler: createAuthWorkerProxyHandlerMock,
}))

import handler from '../../server/api/proxy/[...path]'

interface ProxyWiring {
  sharedSecret: string
  authWorkerFetch: (event: unknown) => typeof fetch
  pathPrefix: string
}

const call = (event: unknown) => (handler as unknown as (e: unknown) => Promise<unknown>)(event)
const eventWith = (env: Record<string, unknown>) => ({ context: { cloudflare: { env } } })

describe('proxy handler wiring (createAuthWorkerProxyHandler, #434 方式B)', () => {
  beforeEach(() => {
    createAuthWorkerProxyHandlerMock.mockClear()
    proxyFn.mockClear()
  })

  it('INTERNAL_SHARED_SECRET + AUTH_WORKER があれば委譲し proxy(event) を返す', async () => {
    const event = eventWith({
      INTERNAL_SHARED_SECRET: 'secret-x',
      AUTH_WORKER: { fetch: vi.fn() },
    })
    const res = await call(event)
    expect(createAuthWorkerProxyHandlerMock).toHaveBeenCalledTimes(1)
    const opts = createAuthWorkerProxyHandlerMock.mock.calls[0]![0] as ProxyWiring
    expect(opts.sharedSecret).toBe('secret-x')
    // pathPrefix='/' (client path が既に /api/ を含むため二重 /api 防止)
    expect(opts.pathPrefix).toBe('/')
    // authWorkerFetch は service binding を返す関数として渡る
    expect(typeof opts.authWorkerFetch).toBe('function')
    expect(proxyFn).toHaveBeenCalledWith(event)
    expect(res).toBe('PROXY_RESULT')
  })

  it('INTERNAL_SHARED_SECRET が Secrets Store binding (.get()) でも解決する', async () => {
    const event = eventWith({
      INTERNAL_SHARED_SECRET: { get: async () => 'from-store' },
      AUTH_WORKER: { fetch: vi.fn() },
    })
    await call(event)
    const opts = createAuthWorkerProxyHandlerMock.mock.calls[0]![0] as ProxyWiring
    expect(opts.sharedSecret).toBe('from-store')
  })

  it('INTERNAL_SHARED_SECRET 未設定なら委譲せず throw する', async () => {
    // 実 h3 createError が 503 を throw する。委譲には到達しない。
    await expect(call(eventWith({ AUTH_WORKER: { fetch: vi.fn() } }))).rejects.toThrow()
    expect(createAuthWorkerProxyHandlerMock).not.toHaveBeenCalled()
  })

  it('AUTH_WORKER service binding 未設定なら委譲せず throw する', async () => {
    // 方式 B では AUTH_WORKER 経由 forward が必須 (fail-closed)。
    await expect(call(eventWith({ INTERNAL_SHARED_SECRET: 'x' }))).rejects.toThrow()
    expect(createAuthWorkerProxyHandlerMock).not.toHaveBeenCalled()
  })
})
