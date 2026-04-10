import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TicketStatusTransition from '~/components/TicketStatusTransition.vue'

vi.mock('~/utils/api', () => ({
  getWorkflowTransitions: vi.fn().mockResolvedValue([
    { id: 't1', tenant_id: 't1', from_state_id: 's1', to_state_id: 's2', label: null, created_at: '2026-01-01' },
  ]),
  transitionTicket: vi.fn().mockResolvedValue(undefined),
}))

const stubs = {
  UFormField: { template: '<div><slot /></div>', props: ['label'] },
  USelect: { template: '<select />', props: ['modelValue', 'items', 'placeholder'] },
  UTextarea: { template: '<textarea />', props: ['modelValue', 'placeholder', 'rows'] },
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
    props: ['label', 'icon', 'loading', 'disabled'],
  },
}

const workflowStates = [
  { id: 's1', tenant_id: 't1', name: 'new', label: '新規', color: '#3b82f6', sort_order: 1, is_initial: true, is_terminal: false, created_at: '2026-01-01' },
  { id: 's2', tenant_id: 't1', name: 'in_progress', label: '対応中', color: '#f59e0b', sort_order: 2, is_initial: false, is_terminal: false, created_at: '2026-01-01' },
]

describe('TicketStatusTransition', () => {
  it('renders heading', async () => {
    const wrapper = mount(TicketStatusTransition, {
      props: { ticketId: 'ticket-1', currentStatusId: 's1', workflowStates },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('ステータス変更')
  })

  it('shows no transitions when currentStatusId has no outgoing transitions', async () => {
    const wrapper = mount(TicketStatusTransition, {
      props: { ticketId: 'ticket-1', currentStatusId: 's2', workflowStates },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('遷移可能なステータスがありません')
  })

  it('shows no transitions when currentStatusId is null', async () => {
    const wrapper = mount(TicketStatusTransition, {
      props: { ticketId: 'ticket-1', currentStatusId: null, workflowStates },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('遷移可能なステータスがありません')
  })
})
