import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TicketStatusHistory from '~/components/TicketStatusHistory.vue'

vi.mock('~/utils/api', () => ({
  getStatusHistory: vi.fn().mockResolvedValue([
    { id: 'h1', tenant_id: 't1', ticket_id: 'ticket-1', from_state_id: 's1', to_state_id: 's2', changed_by: null, comment: '対応開始', created_at: '2026-01-10T00:00:00' },
  ]),
}))

const stubs = {
  UBadge: { template: '<span><slot /></span>' },
}

const workflowStates = [
  { id: 's1', tenant_id: 't1', name: 'new', label: '新規', color: '#3b82f6', sort_order: 1, is_initial: true, is_terminal: false, created_at: '2026-01-01' },
  { id: 's2', tenant_id: 't1', name: 'in_progress', label: '対応中', color: '#f59e0b', sort_order: 2, is_initial: false, is_terminal: false, created_at: '2026-01-01' },
]

describe('TicketStatusHistory', () => {
  it('renders history entries', async () => {
    const wrapper = mount(TicketStatusHistory, {
      props: { ticketId: 'ticket-1', workflowStates },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('新規')
    expect(wrapper.text()).toContain('対応中')
    expect(wrapper.text()).toContain('対応開始')
  })

  it('shows empty state', async () => {
    const { getStatusHistory } = await import('~/utils/api')
    vi.mocked(getStatusHistory).mockResolvedValueOnce([])

    const wrapper = mount(TicketStatusHistory, {
      props: { ticketId: 'ticket-1', workflowStates },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('履歴はありません')
  })

  it('renders heading', async () => {
    const wrapper = mount(TicketStatusHistory, {
      props: { ticketId: 'ticket-1', workflowStates },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('ステータス履歴')
  })
})
