import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { allStubs } from '../../helpers/nuxt-stubs'

// callback の挙動 (consumeFragment 成否 → 遷移 / エラー表示) は
// @ippoan/auth-client の AuthCallback に集約された (Refs ippoan/auth-worker#257)。
// ここでは page が lib コンポーネントに正しい props で委譲していること (wiring)
// だけを固定する。
vi.mock('@ippoan/auth-client', () => ({
  AuthCallback: {
    name: 'AuthCallback',
    props: { redirectTo: { type: String }, loginPath: { type: String } },
    template: '<div data-testid="auth-callback">{{ redirectTo }}|{{ loginPath }}</div>',
  },
}))
vi.mock('#app/composables/router', () => ({
  definePageMeta: vi.fn(),
}))

import CallbackPage from '~/pages/auth/callback.vue'

describe('auth/callback page', () => {
  it('AuthCallback (lib) に /tickets リダイレクトで委譲する', () => {
    const wrapper = mount(CallbackPage, { global: { stubs: allStubs } })
    const el = wrapper.get('[data-testid="auth-callback"]')
    expect(el.text()).toContain('/tickets')
    expect(el.text()).toContain('/login')
  })
})
