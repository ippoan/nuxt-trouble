import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../../helpers/nuxt-stubs'

const handleCallbackMock = vi.fn()
const navigateToMock = vi.fn()

vi.mock('~/composables/useAuth', () => ({ useAuth: () => ({ handleCallback: handleCallbackMock }) }))
vi.mock('#app/composables/router', () => ({
  definePageMeta: vi.fn(),
  navigateTo: (...args: unknown[]) => navigateToMock(...args),
}))
vi.mock('#app/nuxt', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, ref: (val: unknown) => ({ value: val }), onMounted: (fn: () => void) => fn() }
})

import CallbackPage from '~/pages/auth/callback.vue'

describe('auth/callback page', () => {
  beforeEach(() => { handleCallbackMock.mockReset(); navigateToMock.mockReset() })

  it('navigates to /tickets on success', async () => {
    handleCallbackMock.mockReturnValue(true)
    mount(CallbackPage, { global: { stubs: allStubs } })
    await flushPromises()
    expect(navigateToMock).toHaveBeenCalledWith('/tickets')
  })

  it('shows error on failure', async () => {
    handleCallbackMock.mockReturnValue(false)
    const wrapper = mount(CallbackPage, { global: { stubs: allStubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('認証に失敗しました')
  })
})
