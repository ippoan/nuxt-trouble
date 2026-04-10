import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('#app/nuxt', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useRuntimeConfig: () => ({ public: { apiBase: 'http://test' } }),
  }
})

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-signature`
}

function makeValidJwt(overrides: Record<string, unknown> = {}): string {
  return makeJwt({
    sub: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    tenant_id: 'tenant-456',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  })
}

function makeExpiredJwt(): string {
  return makeJwt({
    sub: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    tenant_id: 'tenant-456',
    iat: Math.floor(Date.now() / 1000) - 7200,
    exp: Math.floor(Date.now() / 1000) - 3600,
  })
}

const TOKEN_KEY = 'trouble_token'

describe('useAuth', () => {
  let useAuth: typeof import('~/composables/useAuth')['useAuth']

  beforeEach(async () => {
    localStorage.clear()
    vi.resetModules()
    const mod = await import('~/composables/useAuth')
    useAuth = mod.useAuth
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('init', () => {
    it('sets isLoading to false after init', () => {
      const auth = useAuth()
      auth.init()
      expect(auth.isLoading.value).toBe(false)
    })

    it('restores valid token from localStorage', () => {
      const token = makeValidJwt()
      localStorage.setItem(TOKEN_KEY, token)

      const auth = useAuth()
      auth.init()

      expect(auth.accessToken.value).toBe(token)
      expect(auth.user.value).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        tenant_id: 'tenant-456',
      })
      expect(auth.tenantId.value).toBe('tenant-456')
      expect(auth.isAuthenticated.value).toBe(true)
    })

    it('removes expired token from localStorage', () => {
      const token = makeExpiredJwt()
      localStorage.setItem(TOKEN_KEY, token)

      const auth = useAuth()
      auth.init()

      expect(auth.accessToken.value).toBeNull()
      expect(auth.user.value).toBeNull()
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })

    it('does nothing if already initialized (singleton guard)', () => {
      const token = makeValidJwt()

      const auth = useAuth()
      auth.init()
      expect(auth.accessToken.value).toBeNull()

      localStorage.setItem(TOKEN_KEY, token)
      auth.init()
      expect(auth.accessToken.value).toBeNull()
    })

    it('handles no token in localStorage gracefully', () => {
      const auth = useAuth()
      auth.init()

      expect(auth.accessToken.value).toBeNull()
      expect(auth.user.value).toBeNull()
      expect(auth.isLoading.value).toBe(false)
    })
  })

  describe('handleCallback', () => {
    let replaceStateSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      replaceStateSpy = vi.spyOn(history, 'replaceState').mockImplementation(() => {})
    })

    it('extracts token from URL hash fragment', () => {
      const token = makeValidJwt()
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hash: `#token=${token}`, pathname: '/auth/callback', search: '', origin: 'http://localhost:3000' },
        writable: true,
        configurable: true,
      })

      const auth = useAuth()
      const result = auth.handleCallback()

      expect(result).toBe(true)
      expect(auth.accessToken.value).toBe(token)
      expect(localStorage.getItem(TOKEN_KEY)).toBe(token)
      expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/auth/callback')
    })

    it('returns false if no hash', () => {
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hash: '', pathname: '/', search: '', origin: 'http://localhost:3000' },
        writable: true,
        configurable: true,
      })

      const auth = useAuth()
      expect(auth.handleCallback()).toBe(false)
    })

    it('returns false if token is expired', () => {
      const token = makeExpiredJwt()
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hash: `#token=${token}`, pathname: '/auth/callback', search: '', origin: 'http://localhost:3000' },
        writable: true,
        configurable: true,
      })

      const auth = useAuth()
      expect(auth.handleCallback()).toBe(false)
      expect(auth.accessToken.value).toBeNull()
    })
  })

  describe('loginWithGoogleRedirect', () => {
    it('redirects to rust-alc-api with callback', () => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000', href: 'http://localhost:3000/', pathname: '/', search: '', hash: '' },
        writable: true,
        configurable: true,
      })

      const auth = useAuth()
      auth.loginWithGoogleRedirect()

      const expectedCallback = encodeURIComponent('http://localhost:3000/auth/callback')
      expect(window.location.href).toBe(`http://test/api/auth/google/redirect?redirect_uri=${expectedCallback}`)
    })
  })

  describe('logout', () => {
    it('clears all state and localStorage', () => {
      const token = makeValidJwt()
      localStorage.setItem(TOKEN_KEY, token)

      const auth = useAuth()
      auth.init()
      expect(auth.isAuthenticated.value).toBe(true)

      auth.logout()

      expect(auth.accessToken.value).toBeNull()
      expect(auth.user.value).toBeNull()
      expect(auth.tenantId.value).toBeNull()
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })
  })

  describe('JWT claim compatibility', () => {
    it('falls back to org claim from auth-worker JWT', () => {
      const token = makeJwt({
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        org: 'tid-from-authworker',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      localStorage.setItem(TOKEN_KEY, token)

      const auth = useAuth()
      auth.init()

      expect(auth.tenantId.value).toBe('tid-from-authworker')
    })
  })

  describe('decodeJwt edge cases', () => {
    it('handles JWT with missing payload part', () => {
      localStorage.setItem(TOKEN_KEY, 'no-dots-token')
      const auth = useAuth()
      auth.init()
      expect(auth.accessToken.value).toBeNull()
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })

    it('handles JWT with invalid base64 payload', () => {
      localStorage.setItem(TOKEN_KEY, 'header.!!!invalid!!!.signature')
      const auth = useAuth()
      auth.init()
      expect(auth.accessToken.value).toBeNull()
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })

    it('handles JWT with no exp claim', () => {
      const token = makeJwt({ sub: 'u', email: 'e', name: 'n', iat: 1 })
      localStorage.setItem(TOKEN_KEY, token)
      const auth = useAuth()
      auth.init()
      expect(auth.accessToken.value).toBeNull()
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    })
  })

  describe('handleCallback edge cases', () => {
    it('returns false when hash has no token param', () => {
      vi.spyOn(history, 'replaceState').mockImplementation(() => {})
      Object.defineProperty(window, 'location', {
        value: { hash: '#other=value', pathname: '/cb', search: '', origin: 'http://localhost' },
        writable: true, configurable: true,
      })
      const auth = useAuth()
      expect(auth.handleCallback()).toBe(false)
    })

    it('returns false in SSR (no window)', () => {
      const origWindow = globalThis.window
      // @ts-expect-error -- temporarily remove window for SSR test
      delete globalThis.window
      try {
        const auth = useAuth()
        expect(auth.handleCallback()).toBe(false)
      } finally {
        globalThis.window = origWindow
      }
    })
  })
})
