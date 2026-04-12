import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIsAuthenticated = { value: false }
const mockIsLoading = { value: false }

vi.mock('@ippoan/auth-client', () => ({
  authMiddleware: (options: { publicPaths?: string[]; loginPath?: string }) => {
    const { useRuntimeConfig, navigateTo } = require('#app/nuxt')
    const publicPaths = options?.publicPaths || ['/login']
    const loginPath = options?.loginPath || '/login'

    return (to: { path: string }) => {
      const config = useRuntimeConfig()
      if (config.public.stagingTenantId) return
      if (publicPaths.some((p: string) => to.path.startsWith(p))) return

      if (mockIsLoading.value) return
      if (!mockIsAuthenticated.value) {
        return navigateTo(loginPath)
      }
    }
  },
}))

vi.mock('#app/composables/router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    navigateTo: vi.fn((path: string) => ({ __navigateTo: path })),
    defineNuxtRouteMiddleware: (fn: Function) => fn,
  }
})

vi.mock('#app/nuxt', () => ({
  useRuntimeConfig: () => ({ public: { stagingTenantId: '' } }),
  useNuxtApp: () => ({}),
}))

import middleware from '~/middleware/auth.global'
import { navigateTo } from '#app/composables/router'

const navigateToMock = vi.mocked(navigateTo)

describe('auth.global middleware', () => {
  beforeEach(() => {
    mockIsAuthenticated.value = false
    mockIsLoading.value = false
    navigateToMock.mockClear()
  })

  it('skips /login path', () => {
    const result = (middleware as Function)({ path: '/login' })
    expect(result).toBeUndefined()
  })

  it('skips /auth/callback path', () => {
    const result = (middleware as Function)({ path: '/auth/callback' })
    expect(result).toBeUndefined()
  })

  it('skips when isLoading is true', () => {
    mockIsLoading.value = true
    const result = (middleware as Function)({ path: '/tickets' })
    expect(result).toBeUndefined()
  })

  it('redirects to /login when not authenticated', () => {
    mockIsAuthenticated.value = false
    const result = (middleware as Function)({ path: '/tickets' })
    expect(navigateToMock).toHaveBeenCalledWith('/login')
    expect(result).toEqual({ __navigateTo: '/login' })
  })

  it('allows access when authenticated', () => {
    mockIsAuthenticated.value = true
    const result = (middleware as Function)({ path: '/tickets' })
    expect(result).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
