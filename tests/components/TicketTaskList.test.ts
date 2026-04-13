import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TicketTaskList from '~/components/TicketTaskList.vue'

const sampleTask = {
  id: 'task-1', tenant_id: 't1', ticket_id: 'ticket-1', task_type: 'レッカー対応',
  title: 'テストタスク', description: '', status: 'open', assigned_to: null,
  due_date: null, completed_at: null, sort_order: 0, next_action: '',
  next_action_by: null, next_action_due: null, created_by: null,
  created_at: '2026-04-12T00:00:00Z', updated_at: '2026-04-12T00:00:00Z',
}

const mockGetTasks = vi.fn().mockResolvedValue([sampleTask])
const mockGetTaskTypes = vi.fn().mockResolvedValue([
  { id: '1', name: 'レッカー対応', sort_order: 0, tenant_id: 't1', created_at: '' },
])
const mockCreateTask = vi.fn().mockResolvedValue(sampleTask)
const mockUpdateTask = vi.fn().mockResolvedValue(sampleTask)
const mockDeleteTask = vi.fn().mockResolvedValue(undefined)
const mockGetEmployees = vi.fn().mockResolvedValue([])

vi.mock('~/utils/api', () => ({
  getTasks: (...args: any[]) => mockGetTasks(...args),
  getTaskTypes: (...args: any[]) => mockGetTaskTypes(...args),
  createTask: (...args: any[]) => mockCreateTask(...args),
  updateTask: (...args: any[]) => mockUpdateTask(...args),
  deleteTask: (...args: any[]) => mockDeleteTask(...args),
  getEmployees: (...args: any[]) => mockGetEmployees(...args),
}))

const stubs = {
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot />{{ label }}</button>',
    props: ['label', 'icon', 'loading', 'disabled', 'size', 'variant', 'color'],
  },
  UIcon: { template: '<span />', props: ['name'] },
  UBadge: { template: '<span><slot /></span>', props: ['variant', 'size'] },
  USelect: { template: '<select />', props: ['modelValue', 'items', 'size', 'valueKey'] },
  UInput: {
    template: '<input :type="type" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" />',
    props: ['modelValue', 'type', 'placeholder', 'size', 'list'],
    emits: ['update:modelValue', 'keydown'],
  },
  UFormField: { template: '<div><slot /></div>', props: ['label'] },
  TicketTaskCard: { template: '<div class="task-card">{{ task.title }}</div>', props: ['task'] },
}

describe('TicketTaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTasks.mockResolvedValue([sampleTask])
    mockGetTaskTypes.mockResolvedValue([
      { id: '1', name: 'レッカー対応', sort_order: 0, tenant_id: 't1', created_at: '' },
    ])
    mockGetEmployees.mockResolvedValue([])
  })

  it('renders heading', async () => {
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('状況管理')
  })

  it('shows empty message when no tasks', async () => {
    mockGetTasks.mockResolvedValue([])
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('状況管理項目はありません')
  })

  it('renders task list when tasks exist', async () => {
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('テストタスク')
  })

  it('handleAddTask sends null for empty due_date', async () => {
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()

    const titleInput = wrapper.find('input[placeholder="タイトル"]')
    await titleInput.setValue('新しいタスク')
    await wrapper.vm.$nextTick()

    mockCreateTask.mockResolvedValue({ ...sampleTask, id: 'task-new', title: '新しいタスク' })
    await titleInput.trigger('keydown.enter')
    await flushPromises()

    expect(mockCreateTask).toHaveBeenCalled()
    const callArgs = mockCreateTask.mock.calls[0]
    expect(callArgs[1].due_date).toBeNull()
  })
})
