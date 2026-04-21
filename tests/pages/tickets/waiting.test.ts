import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../../helpers/nuxt-stubs'

const navigateToMock = vi.fn()
vi.mock('#app/composables/router', () => ({
  navigateTo: (...args: unknown[]) => navigateToMock(...args),
}))

const getTaskStatusesMock = vi.fn()
vi.mock('~/utils/api', () => ({
  getTaskStatuses: (...args: unknown[]) => getTaskStatusesMock(...args),
}))

describe('waiting page (redirect to /tasks?status=waiting)', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
    getTaskStatusesMock.mockReset()
    vi.resetModules()
  })

  it('redirects to /tasks?status=waiting when waiting key exists', async () => {
    getTaskStatusesMock.mockResolvedValue([
      { id: '1', tenant_id: 't', key: 'open', name: '未着手', color: '#fff', sort_order: 10, is_done: false, created_at: '', updated_at: '' },
      { id: '2', tenant_id: 't', key: 'waiting', name: '待機', color: '#F59E0B', sort_order: 30, is_done: false, created_at: '', updated_at: '' },
    ])
    const { default: WaitingPage } = await import('~/pages/tickets/waiting.vue')
    mount(WaitingPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(navigateToMock).toHaveBeenCalledWith('/tasks?status=waiting', { replace: true })
  })

  it('falls back to status=waiting when API fails', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getTaskStatusesMock.mockRejectedValue(new Error('boom'))
    const { default: WaitingPage } = await import('~/pages/tickets/waiting.vue')
    mount(WaitingPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(navigateToMock).toHaveBeenCalledWith('/tasks?status=waiting', { replace: true })
    errSpy.mockRestore()
  })

  it('uses matching key by 名前 (待機) when key differs', async () => {
    getTaskStatusesMock.mockResolvedValue([
      { id: '1', tenant_id: 't', key: 'pending', name: '待機', color: '#F59E0B', sort_order: 30, is_done: false, created_at: '', updated_at: '' },
    ])
    const { default: WaitingPage } = await import('~/pages/tickets/waiting.vue')
    mount(WaitingPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(navigateToMock).toHaveBeenCalledWith('/tasks?status=pending', { replace: true })
  })
})
