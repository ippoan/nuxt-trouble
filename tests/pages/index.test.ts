import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const navigateToMock = vi.fn()

vi.mock('#app/composables/router', () => ({
  navigateTo: (...args: unknown[]) => navigateToMock(...args),
}))

import IndexPage from '~/pages/index.vue'

describe('index page', () => {
  it('redirects to /tickets', () => {
    mount(IndexPage)
    expect(navigateToMock).toHaveBeenCalledWith('/tickets', { replace: true })
  })
})
