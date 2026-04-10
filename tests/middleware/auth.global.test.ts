import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('#app/nuxt', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useRuntimeConfig: () => ({ public: { apiBase: 'http://test' } }),
  }
})

const TOKEN_KEY = 'trouble_token'

function makeValidJwt(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify({
    sub: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    tenant_id: 'tenant-456',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }))
  return `${header}.${body}.fake-signature`
}

describe('auth.global middleware', () => {
  let middleware: (to: { path: string }) => unknown
  let useAuth: typeof import('~/composables/useAuth')['useAuth']
  const mockNavigateTo = vi.fn()

  beforeEach(async () => {
    localStorage.clear()
    vi.resetModules()
    vi.stubGlobal('navigateTo', mockNavigateTo)
    mockNavigateTo.mockReset()

    const authMod = await import('~/composables/useAuth')
    useAuth = authMod.useAuth

    const mod = await import('~/middleware/auth.global')
    middleware = (mod.default as { handler: (to: { path: string }) => unknown }).handler
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('allows public paths (/login)', () => {
    const result = middleware({ path: '/login' })
    expect(result).toBeUndefined()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('allows public paths (/auth/callback)', () => {
    const result = middleware({ path: '/auth/callback' })
    expect(result).toBeUndefined()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('redirects unauthenticated to /login', () => {
    const auth = useAuth()
    auth.init()

    middleware({ path: '/tickets' })
    expect(mockNavigateTo).toHaveBeenCalledWith('/login')
  })

  it('allows authenticated users', () => {
    localStorage.setItem(TOKEN_KEY, makeValidJwt())
    const auth = useAuth()
    auth.init()

    const result = middleware({ path: '/tickets' })
    expect(result).toBeUndefined()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })
})
