import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TicketTaskList from '~/components/TicketTaskList.vue'

const sampleTask = {
  id: 'task-1', tenant_id: 't1', ticket_id: 'ticket-1', task_type: 'レッカー対応',
  title: 'テストタスク', description: '', status: 'open', assigned_to: null,
  due_date: null, completed_at: null, sort_order: 0, next_action: '',
  next_action_detail: '', next_action_by: null, next_action_due: null, created_by: null,
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
const mockGetTaskStatuses = vi.fn().mockResolvedValue([])

vi.mock('~/utils/api', () => ({
  getTasks: (...args: any[]) => mockGetTasks(...args),
  getTaskTypes: (...args: any[]) => mockGetTaskTypes(...args),
  createTask: (...args: any[]) => mockCreateTask(...args),
  updateTask: (...args: any[]) => mockUpdateTask(...args),
  deleteTask: (...args: any[]) => mockDeleteTask(...args),
  getEmployees: (...args: any[]) => mockGetEmployees(...args),
  getTaskStatuses: (...args: any[]) => mockGetTaskStatuses(...args),
  getTaskFiles: vi.fn().mockResolvedValue([]),
  uploadTaskFile: vi.fn().mockResolvedValue({}),
  downloadTaskFile: vi.fn().mockResolvedValue(undefined),
  deleteTaskFile: vi.fn().mockResolvedValue(undefined),
  restoreTaskFile: vi.fn().mockResolvedValue(undefined),
  getTrashFiles: vi.fn().mockResolvedValue([]),
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
  UModal: { template: '<div v-if="open"><slot name="content" /></div>', props: ['open'] },
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
    mockGetTaskStatuses.mockResolvedValue([])
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

  it('statusOptions uses fetched task statuses when loaded', async () => {
    mockGetTaskStatuses.mockResolvedValue([
      { id: '1', tenant_id: 't1', key: 'waiting', name: '待機', color: '#F59E0B', sort_order: 30, is_done: false, created_at: '', updated_at: '' },
      { id: '2', tenant_id: 't1', key: 'done', name: '完了', color: '#10B981', sort_order: 40, is_done: true, created_at: '', updated_at: '' },
    ])
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()
    const vm = wrapper.vm as unknown as { statusOptions: Array<{ label: string; value: string }> }
    expect(vm.statusOptions.some(o => o.value === 'waiting' && o.label === '待機')).toBe(true)
  })

  it('statusOptions falls back to TASK_STATUS_LABELS when task statuses empty', async () => {
    mockGetTaskStatuses.mockResolvedValue([])
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()
    const vm = wrapper.vm as unknown as { statusOptions: Array<{ label: string; value: string }> }
    expect(vm.statusOptions.some(o => o.value === 'open')).toBe(true)
    expect(vm.statusOptions.some(o => o.value === 'done')).toBe(true)
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
