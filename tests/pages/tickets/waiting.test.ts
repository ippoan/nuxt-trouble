import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../../helpers/nuxt-stubs'
import { makeTroubleTicket, makeWorkflowState } from '../../helpers/test-data'

const pushMock = vi.fn()
vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const getTicketsMock = vi.fn()
const getProgressStatusesMock = vi.fn()
const getWorkflowStatesMock = vi.fn()
vi.mock('~/utils/api', () => ({
  getTickets: (...args: unknown[]) => getTicketsMock(...args),
  getProgressStatuses: (...args: unknown[]) => getProgressStatusesMock(...args),
  getWorkflowStates: (...args: unknown[]) => getWorkflowStatesMock(...args),
}))

import WaitingPage from '~/pages/tickets/waiting.vue'

const waitingProgress = {
  id: 'prog-w', tenant_id: 'tenant-1', name: '待機', sort_order: 1, created_at: '2026-01-01',
}
const otherProgress = {
  id: 'prog-o', tenant_id: 'tenant-1', name: '対応中', sort_order: 2, created_at: '2026-01-01',
}

describe('waiting page', () => {
  beforeEach(() => {
    pushMock.mockReset()
    getTicketsMock.mockReset()
    getProgressStatusesMock.mockReset()
    getWorkflowStatesMock.mockReset()
  })

  it('shows only tickets matching 待機', async () => {
    const tickets = [
      makeTroubleTicket({ id: 't1', ticket_no: 1, progress_notes: '待機', description: '待機チケット' }),
      makeTroubleTicket({ id: 't2', ticket_no: 2, progress_notes: '対応中', description: '対応中チケット' }),
      makeTroubleTicket({ id: 't3', ticket_no: 3, progress_notes: '', description: '空' }),
    ]
    getTicketsMock.mockResolvedValue({ tickets, total: 3, page: 1, per_page: 1000 })
    getProgressStatusesMock.mockResolvedValue([waitingProgress, otherProgress])
    getWorkflowStatesMock.mockResolvedValue([makeWorkflowState({ id: 'state-1', label: '新規' })])

    const wrapper = mount(WaitingPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('待機チケット')
    expect(wrapper.text()).not.toContain('対応中チケット')
    expect(wrapper.text()).not.toContain('空')
  })

  it('shows empty state when no 待機 status defined', async () => {
    getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 1000 })
    getProgressStatusesMock.mockResolvedValue([otherProgress])
    getWorkflowStatesMock.mockResolvedValue([])

    const wrapper = mount(WaitingPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('「待機」が登録されていません')
  })

  it('shows empty list when 待機 status exists but no matching tickets', async () => {
    const tickets = [
      makeTroubleTicket({ id: 't1', progress_notes: '対応中' }),
    ]
    getTicketsMock.mockResolvedValue({ tickets, total: 1, page: 1, per_page: 1000 })
    getProgressStatusesMock.mockResolvedValue([waitingProgress])
    getWorkflowStatesMock.mockResolvedValue([])

    const wrapper = mount(WaitingPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('待機中のチケットはありません')
  })

  it('navigates on row click', async () => {
    const tickets = [
      makeTroubleTicket({ id: 't1', ticket_no: 1, progress_notes: '待機', description: 'X' }),
    ]
    getTicketsMock.mockResolvedValue({ tickets, total: 1, page: 1, per_page: 1000 })
    getProgressStatusesMock.mockResolvedValue([waitingProgress])
    getWorkflowStatesMock.mockResolvedValue([])

    const wrapper = mount(WaitingPage, { global: { stubs: allStubs } })
    await flushPromises()

    const row = wrapper.find('tbody tr')
    await row.trigger('click')
    expect(pushMock).toHaveBeenCalledWith('/tickets/t1')
  })

  it('renders status badge with workflow state color', async () => {
    const state = makeWorkflowState({ id: 'state-1', label: '対応中', color: '#3b82f6' })
    const tickets = [
      makeTroubleTicket({ id: 't1', progress_notes: '待機', status_id: 'state-1' }),
      makeTroubleTicket({ id: 't2', progress_notes: '待機', status_id: null }),
    ]
    getTicketsMock.mockResolvedValue({ tickets, total: 2, page: 1, per_page: 1000 })
    getProgressStatusesMock.mockResolvedValue([waitingProgress])
    getWorkflowStatesMock.mockResolvedValue([state])

    const wrapper = mount(WaitingPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('対応中')
  })

  it('reloads when 再読み込み clicked', async () => {
    getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 1000 })
    getProgressStatusesMock.mockResolvedValue([])
    getWorkflowStatesMock.mockResolvedValue([])

    const wrapper = mount(WaitingPage, { global: { stubs: allStubs } })
    await flushPromises()
    expect(getTicketsMock).toHaveBeenCalledTimes(1)

    const buttons = wrapper.findAll('button')
    const beforeCount = getTicketsMock.mock.calls.length
    await buttons[0].trigger('click')
    await flushPromises()
    expect(getTicketsMock.mock.calls.length).toBeGreaterThan(beforeCount)
  })

  it('handles getProgressStatuses error gracefully', async () => {
    getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 1000 })
    getProgressStatusesMock.mockRejectedValue(new Error('boom'))
    getWorkflowStatesMock.mockResolvedValue([])

    const wrapper = mount(WaitingPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('「待機」が登録されていません')
  })

  it('handles getWorkflowStates error gracefully', async () => {
    const tickets = [makeTroubleTicket({ id: 't1', progress_notes: '待機' })]
    getTicketsMock.mockResolvedValue({ tickets, total: 1, page: 1, per_page: 1000 })
    getProgressStatusesMock.mockResolvedValue([waitingProgress])
    getWorkflowStatesMock.mockRejectedValue(new Error('boom'))

    const wrapper = mount(WaitingPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('待機')
  })

  it('logs and recovers when load fails', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getTicketsMock.mockRejectedValue(new Error('boom'))
    getProgressStatusesMock.mockResolvedValue([])
    getWorkflowStatesMock.mockResolvedValue([])

    const wrapper = mount(WaitingPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})
