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
    expect(wrapper.text()).toContain('ステータス管理')
    expect(wrapper.text()).toContain('待機一覧')
    expect(wrapper.text()).toContain('状況管理')
    expect(wrapper.text()).toContain('設定')
    expect(wrapper.text()).toContain('テストユーザー')
    expect(wrapper.text()).toContain('content')
  })

  it('renders 5 nav items, situations/waiting/tasks open in new tab', () => {
    const NuxtLinkSpy = {
      template: '<a :data-to="to" :data-target="target" :data-rel="rel"><slot /></a>',
      props: ['to', 'target', 'rel'],
    }
    const wrapper = mount(DefaultLayout, {
      global: { stubs: { ...allStubs, NuxtLink: NuxtLinkSpy } },
    })
    const links = wrapper.findAll('a')
    expect(links).toHaveLength(5)
    const situations = links.find(l => l.attributes('data-to') === '/tickets/situations')
    const waiting = links.find(l => l.attributes('data-to') === '/tickets/waiting')
    const tasks = links.find(l => l.attributes('data-to') === '/tasks')
    const list = links.find(l => l.attributes('data-to') === '/tickets')
    expect(situations?.attributes('data-target')).toBe('_blank')
    expect(situations?.attributes('data-rel')).toBe('noopener')
    expect(waiting?.attributes('data-target')).toBe('_blank')
    expect(waiting?.attributes('data-rel')).toBe('noopener')
    expect(tasks?.attributes('data-target')).toBe('_blank')
    expect(tasks?.attributes('data-rel')).toBe('noopener')
    // /tickets has no target → undefined attribute
    expect(list?.attributes('data-target')).toBeUndefined()
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
