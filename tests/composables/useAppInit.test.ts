import { describe, it, expect, vi, beforeEach } from 'vitest'

const initApiMock = vi.fn()
const loadFromStorageMock = vi.fn()
const clearAuthMock = vi.fn()

vi.mock('~/utils/api', () => ({
  initApi: (...args: unknown[]) => initApiMock(...args),
}))

vi.mock('~/composables/useAuth', () => {
  const { ref } = require('vue')
  return {
    useAuth: () => ({
      loadFromStorage: loadFromStorageMock,
      clearAuth: clearAuthMock,
      token: ref('test-token'),
      orgId: ref('test-org'),
      isLoading: ref(false),
    }),
  }
})

vi.mock('#app/nuxt', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useRuntimeConfig: () => ({
      public: { apiBase: 'https://api.test', stagingTenantId: 'stg-tenant' },
    }),
  }
})

vi.mock('#app/composables/router', () => ({
  navigateTo: vi.fn(),
}))

import { useAppInit } from '~/composables/useAppInit'

describe('useAppInit', () => {
  beforeEach(() => {
    initApiMock.mockReset()
    loadFromStorageMock.mockReset()
    clearAuthMock.mockReset()
  })

  it('returns apiBase and stagingTenantId from config', () => {
    const { apiBase, stagingTenantId } = useAppInit()
    expect(apiBase).toBe('https://api.test')
    expect(stagingTenantId).toBe('stg-tenant')
  })

  it('setup calls initApi (via /api/proxy, tenant 注入は server 側) and loadFromStorage', async () => {
    const { setup } = useAppInit()
    await setup()

    // #434 step 2: base は /api/proxy (同一 Worker server route)、tenantIdGetter は
    // 渡さない (proxy が introspect で X-Tenant-ID を注入する)。
    expect(initApiMock).toHaveBeenCalledWith(
      '/api/proxy',
      expect.any(Function),
      undefined,
      undefined,
      expect.any(Function),
    )
    expect(loadFromStorageMock).toHaveBeenCalled()

    const tokenGetter = initApiMock.mock.calls[0][1]
    expect(tokenGetter()).toBe('test-token')
  })

  it('returns isLoading ref', () => {
    const { isLoading } = useAppInit()
    expect(isLoading.value).toBe(false)
  })

  it('onUnauthorized handler clears auth and navigates to /login', async () => {
    const { setup } = useAppInit()
    await setup()

    const onUnauthorized = initApiMock.mock.calls[0][4] as () => void
    onUnauthorized()

    expect(clearAuthMock).toHaveBeenCalled()
    const { navigateTo } = await import('#app/composables/router')
    expect(navigateTo).toHaveBeenCalledWith('/login')
  })
})
