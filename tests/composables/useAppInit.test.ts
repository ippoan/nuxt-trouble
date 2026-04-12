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

  it('setup calls initApi and loadFromStorage', async () => {
    const { setup } = useAppInit()
    await setup()

    expect(initApiMock).toHaveBeenCalledWith(
      'https://api.test',
      expect.any(Function),
      undefined,
      expect.any(Function),
      expect.any(Function),
    )
    expect(loadFromStorageMock).toHaveBeenCalled()

    const tokenGetter = initApiMock.mock.calls[0][1]
    const orgIdGetter = initApiMock.mock.calls[0][3]
    expect(tokenGetter()).toBe('test-token')
    expect(orgIdGetter()).toBe('test-org')
  })

  it('returns isLoading ref', () => {
    const { isLoading } = useAppInit()
    expect(isLoading.value).toBe(false)
  })
})
