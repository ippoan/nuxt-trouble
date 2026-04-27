import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { allStubs } from '../helpers/nuxt-stubs'

vi.mock('~/composables/useAuth', () => ({
  AuthToolbar: { template: '<div data-testid="auth-toolbar"><button>Apps</button></div>' },
}))

vi.mock('#app/composables/router', () => ({
  useRoute: () => ({ path: '/tickets' }),
}))


import DefaultLayout from '~/layouts/default.vue'

describe('default layout', () => {
  it('renders navigation and AuthToolbar', () => {
    const wrapper = mount(DefaultLayout, { global: { stubs: allStubs }, slots: { default: '<p>content</p>' } })
    expect(wrapper.text()).toContain('チケット一覧')
    expect(wrapper.text()).toContain('ステータス管理')
    expect(wrapper.text()).toContain('待機一覧')
    expect(wrapper.text()).toContain('状況管理')
    expect(wrapper.text()).toContain('設定')
    expect(wrapper.find('[data-testid="auth-toolbar"]').exists()).toBe(true)
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

  it('wraps each nav item in a tooltip with descriptive text', () => {
    const wrapper = mount(DefaultLayout, { global: { stubs: allStubs } })
    const tooltips = wrapper.findAll('[data-tooltip]')
    const texts = tooltips.map(t => t.attributes('data-tooltip'))
    expect(texts).toContain('すべてのトラブルチケットを一覧表示・編集・新規作成')
    expect(texts).toContain('ワークフロー状態別 (未着手/対応中/完了など) のカンバン表示')
    expect(texts).toContain('進捗状況が「待機」のチケットのみ抽出')
    expect(texts).toContain('全チケット横断の状況 (サブタスク) 一覧、フィルタ・並び替え可')
    expect(texts).toContain('カテゴリ / 営業所 / ワークフロー / 通知などのマスタ管理')
  })
})
