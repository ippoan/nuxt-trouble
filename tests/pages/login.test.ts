import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { allStubs } from '../helpers/nuxt-stubs'

const redirectToLoginMock = vi.fn()
vi.mock('~/composables/useAuth', () => ({ useAuth: () => ({ redirectToLogin: redirectToLoginMock }) }))
vi.mock('#app/composables/router', () => ({ definePageMeta: vi.fn() }))
vi.mock('#app/nuxt', () => ({
  useRuntimeConfig: () => ({ public: {} }),
  useNuxtApp: () => ({}),
}))

import LoginPage from '~/pages/login.vue'

describe('login page', () => {
  it('renders login UI', () => {
    const wrapper = mount(LoginPage, { global: { stubs: allStubs } })
    expect(wrapper.text()).toContain('トラブル管理')
  })

  it('calls redirectToLogin on click', async () => {
    const wrapper = mount(LoginPage, { global: { stubs: allStubs } })
    await wrapper.find('button').trigger('click')
    expect(redirectToLoginMock).toHaveBeenCalledWith({ provider: 'google', callbackPath: '/auth/callback' })
  })
})
