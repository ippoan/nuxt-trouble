import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TicketTaskCard from '~/components/TicketTaskCard.vue'

vi.mock('~/utils/api', () => ({
  getActivities: vi.fn().mockResolvedValue([]),
  createActivity: vi.fn(),
  deleteActivity: vi.fn(),
  getActivityFiles: vi.fn().mockResolvedValue([]),
  uploadActivityFile: vi.fn(),
  downloadActivityFile: vi.fn(),
  deleteActivityFile: vi.fn(),
  updateTask: vi.fn(),
}))

const stubs = {
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot />{{ label }}</button>',
    props: ['label', 'icon', 'loading', 'disabled', 'size', 'variant', 'color'],
  },
  UIcon: { template: '<span />', props: ['name'] },
  USelect: {
    template: '<select><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
    props: ['modelValue', 'items', 'size'],
  },
}

const sampleTask = {
  id: 'task-1', tenant_id: 't1', ticket_id: 'ticket-1', task_type: 'レッカー対応',
  title: 'テストタスク', description: '', status: 'open', assigned_to: null,
  due_date: null, completed_at: null, sort_order: 0, next_action: '',
  next_action_by: null, next_action_due: null, created_by: null,
  created_at: '2026-04-12T00:00:00Z', updated_at: '2026-04-12T00:00:00Z',
}

describe('TicketTaskCard', () => {
  it('renders task title', async () => {
    const wrapper = mount(TicketTaskCard, {
      props: { task: sampleTask },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('テストタスク')
  })

  it('renders status badge', async () => {
    const wrapper = mount(TicketTaskCard, {
      props: { task: sampleTask },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('未着手')
  })

  it('renders next action placeholder when empty', async () => {
    const wrapper = mount(TicketTaskCard, {
      props: { task: sampleTask },
      global: { stubs },
    })
    await flushPromises()
    const nextActionInput = wrapper.find('input[placeholder="次のアクション..."]')
    expect(nextActionInput.exists()).toBe(true)
    expect((nextActionInput.element as HTMLInputElement).value).toBe('')
  })
})
