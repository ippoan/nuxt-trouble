import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { allStubs } from '../helpers/nuxt-stubs'

const clearAuthMock = vi.fn()
const navigateToMock = vi.fn()

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    username: ref('テストユーザー'),
    clearAuth: clearAuthMock,
  }),
}))

vi.mock('#app/composables/router', () => ({
  useRoute: () => ({ path: '/tickets' }),
  navigateTo: (...args: unknown[]) => navigateToMock(...args),
}))


import DefaultLayout from '~/layouts/default.vue'

describe('default layout', () => {
  beforeEach(() => { clearAuthMock.mockReset(); navigateToMock.mockReset() })

  it('renders navigation and user name', () => {
    const wrapper = mount(DefaultLayout, { global: { stubs: allStubs }, slots: { default: '<p>content</p>' } })
    expect(wrapper.text()).toContain('チケット一覧')
    expect(wrapper.text()).toContain('テストユーザー')
    expect(wrapper.text()).toContain('content')
  })

  it('handles logout', async () => {
    const wrapper = mount(DefaultLayout, { global: { stubs: allStubs } })
    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')
    await flushPromises()
    expect(clearAuthMock).toHaveBeenCalled()
    expect(navigateToMock).toHaveBeenCalledWith('/login')
  })
})
