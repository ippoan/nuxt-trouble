import { describe, it, expect, vi, beforeEach } from 'vitest'

const initApiMock = vi.fn()
const initMock = vi.fn().mockResolvedValue(undefined)

vi.mock('~/utils/api', () => ({
  initApi: (...args: unknown[]) => initApiMock(...args),
}))

vi.mock('~/composables/useAuth', () => {
  const { ref } = require('vue')
  return {
    useAuth: () => ({
      init: initMock,
      accessToken: ref('test-token'),
      tenantId: ref('test-tenant'),
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

import { useAppInit } from '~/composables/useAppInit'

describe('useAppInit', () => {
  beforeEach(() => {
    initApiMock.mockReset()
    initMock.mockReset().mockResolvedValue(undefined)
  })

  it('returns apiBase and stagingTenantId from config', () => {
    const { apiBase, stagingTenantId } = useAppInit()
    expect(apiBase).toBe('https://api.test')
    expect(stagingTenantId).toBe('stg-tenant')
  })

  it('setup calls initApi with correct args and init', async () => {
    const { setup } = useAppInit()
    await setup()

    expect(initApiMock).toHaveBeenCalledWith(
      'https://api.test',
      expect.any(Function),
      undefined,
      expect.any(Function),
    )
    expect(initMock).toHaveBeenCalled()

    // Exercise the arrow function getters
    const tokenGetter = initApiMock.mock.calls[0][1]
    const tenantGetter = initApiMock.mock.calls[0][3]
    expect(tokenGetter()).toBe('test-token')
    expect(tenantGetter()).toBe('test-tenant')
  })

  it('returns isLoading ref', () => {
    const { isLoading } = useAppInit()
    expect(isLoading.value).toBe(false)
  })
})
