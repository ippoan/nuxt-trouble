import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TicketStatusTransition from '~/components/TicketStatusTransition.vue'

vi.mock('~/utils/api', () => ({
  getWorkflowTransitions: vi.fn().mockResolvedValue([
    { id: 't1', tenant_id: 't1', from_state_id: 's1', to_state_id: 's2', label: null, created_at: '2026-01-01' },
  ]),
  transitionTicket: vi.fn().mockResolvedValue(undefined),
  getStatusHistory: vi.fn().mockResolvedValue([]),
}))

const stubs = {
  UBadge: {
    template: '<span @click="$emit(\'click\')"><slot /></span>',
    props: ['style', 'variant'],
  },
  UModal: {
    template: '<div v-if="open"><slot name="content" /></div>',
    props: ['open'],
  },
  USelect: { template: '<select />', props: ['modelValue', 'items', 'placeholder'] },
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
    props: ['label', 'icon', 'loading', 'disabled', 'variant', 'color'],
  },
  UIcon: { template: '<i />', props: ['name', 'class'] },
}

const workflowStates = [
  { id: 's1', tenant_id: 't1', name: 'new', label: '新規', color: '#3b82f6', sort_order: 1, is_initial: true, is_terminal: false, created_at: '2026-01-01' },
  { id: 's2', tenant_id: 't1', name: 'in_progress', label: '対応中', color: '#f59e0b', sort_order: 2, is_initial: false, is_terminal: false, created_at: '2026-01-01' },
]

describe('TicketStatusTransition', () => {
  it('renders current status as badge', async () => {
    const wrapper = mount(TicketStatusTransition, {
      props: { ticketId: 'ticket-1', currentStatusId: 's1', workflowStates },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('新規')
  })

  it('shows chevron when transitions are available', async () => {
    const wrapper = mount(TicketStatusTransition, {
      props: { ticketId: 'ticket-1', currentStatusId: 's1', workflowStates },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.find('i').exists()).toBe(true)
  })

  it('does not show chevron when no transitions available', async () => {
    const wrapper = mount(TicketStatusTransition, {
      props: { ticketId: 'ticket-1', currentStatusId: 's2', workflowStates },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.find('i').exists()).toBe(false)
  })

  it('does not render badge when currentStatusId is null', async () => {
    const wrapper = mount(TicketStatusTransition, {
      props: { ticketId: 'ticket-1', currentStatusId: null, workflowStates },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'UBadge' }).exists()).toBe(false)
  })
})
