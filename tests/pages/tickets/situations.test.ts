import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../../helpers/nuxt-stubs'
import { makeTroubleTicket, makeWorkflowState } from '../../helpers/test-data'

const pushMock = vi.fn()
vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const getTicketsMock = vi.fn()
const getWorkflowStatesMock = vi.fn()
vi.mock('~/utils/api', () => ({
  getTickets: (...args: unknown[]) => getTicketsMock(...args),
  getWorkflowStates: (...args: unknown[]) => getWorkflowStatesMock(...args),
}))

import SituationsPage from '~/pages/tickets/situations.vue'

describe('situations page', () => {
  beforeEach(() => {
    pushMock.mockReset()
    getTicketsMock.mockReset()
    getWorkflowStatesMock.mockReset()
  })

  it('groups tickets by workflow_state_id, shows headers, navigates on click', async () => {
    const stateA = makeWorkflowState({ id: 'state-a', label: '対応中', color: '#3b82f6' })
    const stateB = makeWorkflowState({ id: 'state-b', label: '完了', color: '#10b981' })
    const tickets = [
      makeTroubleTicket({ id: 't1', ticket_no: 1, status_id: 'state-a', title: 'チケットA1' }),
      makeTroubleTicket({ id: 't2', ticket_no: 2, status_id: 'state-a', title: 'チケットA2' }),
      makeTroubleTicket({ id: 't3', ticket_no: 3, status_id: 'state-b', title: 'チケットB1' }),
    ]
    getTicketsMock.mockResolvedValue({ tickets, total: 3, page: 1, per_page: 1000 })
    getWorkflowStatesMock.mockResolvedValue([stateA, stateB])

    const wrapper = mount(SituationsPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('対応中')
    expect(wrapper.text()).toContain('完了')
    expect(wrapper.text()).toContain('チケットA1')
    expect(wrapper.text()).toContain('チケットA2')
    expect(wrapper.text()).toContain('チケットB1')
    expect(wrapper.text()).toContain('(2)')
    expect(wrapper.text()).toContain('(1)')

    const cards = wrapper.findAll('.cursor-pointer')
    await cards[0].trigger('click')
    expect(pushMock).toHaveBeenCalledWith('/tickets/t1')
  })

  it('renders empty column header even with no tickets', async () => {
    const stateA = makeWorkflowState({ id: 'state-a', label: '対応中' })
    getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 1000 })
    getWorkflowStatesMock.mockResolvedValue([stateA])

    const wrapper = mount(SituationsPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('対応中')
    expect(wrapper.text()).toContain('(0)')
  })

  it('shows message when no workflow states defined', async () => {
    getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 1000 })
    getWorkflowStatesMock.mockResolvedValue([])

    const wrapper = mount(SituationsPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('ワークフローが未設定')
  })

  it('groups tickets with unknown status into 未設定 column', async () => {
    const stateA = makeWorkflowState({ id: 'state-a', label: '対応中' })
    const tickets = [
      makeTroubleTicket({ id: 't1', ticket_no: 1, status_id: null, title: 'No status' }),
      makeTroubleTicket({ id: 't2', ticket_no: 2, status_id: 'unknown-state', title: 'Unknown' }),
    ]
    getTicketsMock.mockResolvedValue({ tickets, total: 2, page: 1, per_page: 1000 })
    getWorkflowStatesMock.mockResolvedValue([stateA])

    const wrapper = mount(SituationsPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('未設定')
    expect(wrapper.text()).toContain('No status')
    expect(wrapper.text()).toContain('Unknown')
  })

  it('handles getWorkflowStates error gracefully (catch returns [])', async () => {
    getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 1000 })
    getWorkflowStatesMock.mockRejectedValue(new Error('boom'))

    const wrapper = mount(SituationsPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('ワークフローが未設定')
  })

  it('logs and recovers when load fails', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getTicketsMock.mockRejectedValue(new Error('boom'))
    getWorkflowStatesMock.mockResolvedValue([])

    const wrapper = mount(SituationsPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(errSpy).toHaveBeenCalled()
    expect(wrapper.text()).toContain('ワークフローが未設定')
    errSpy.mockRestore()
  })

  it('truncates long ticket titles', async () => {
    const stateA = makeWorkflowState({ id: 'state-a', label: '対応中' })
    const longTitle = 'あ'.repeat(60)
    const tickets = [
      makeTroubleTicket({ id: 't1', ticket_no: 1, status_id: 'state-a', title: longTitle }),
      // No title → falls back to description
      makeTroubleTicket({ id: 't2', ticket_no: 2, status_id: 'state-a', title: '', description: '短い説明' }),
      // No title and no description → falls back to category
      makeTroubleTicket({ id: 't3', ticket_no: 3, status_id: 'state-a', title: '', description: '', category: 'カテゴリのみ' }),
    ]
    getTicketsMock.mockResolvedValue({ tickets, total: 3, page: 1, per_page: 1000 })
    getWorkflowStatesMock.mockResolvedValue([stateA])

    const wrapper = mount(SituationsPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('...')
    expect(wrapper.text()).toContain('短い説明')
    expect(wrapper.text()).toContain('カテゴリのみ')
  })

  it('reload button refetches', async () => {
    getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 1000 })
    getWorkflowStatesMock.mockResolvedValue([])

    const wrapper = mount(SituationsPage, { global: { stubs: allStubs } })
    await flushPromises()
    expect(getTicketsMock).toHaveBeenCalledTimes(1)

    const buttons = wrapper.findAll('button')
    const beforeCount = getTicketsMock.mock.calls.length
    await buttons[0].trigger('click')
    await flushPromises()
    expect(getTicketsMock.mock.calls.length).toBeGreaterThan(beforeCount)
  })

  it('shows assignee and registration on cards', async () => {
    const stateA = makeWorkflowState({ id: 'state-a', label: '対応中' })
    const tickets = [
      makeTroubleTicket({
        id: 't1', ticket_no: 1, status_id: 'state-a', title: 'A',
        assigned_to: '田中太郎', registration_number: '品川 100 あ 1234',
      }),
    ]
    getTicketsMock.mockResolvedValue({ tickets, total: 1, page: 1, per_page: 1000 })
    getWorkflowStatesMock.mockResolvedValue([stateA])

    const wrapper = mount(SituationsPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('田中太郎')
    expect(wrapper.text()).toContain('品川 100 あ 1234')
  })
})
